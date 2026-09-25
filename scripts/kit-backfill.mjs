#!/usr/bin/env node
/**
 * Gives everyone who bought the kit before packs existed the full kit on the
 * new downloads page. Their old link (`/api/production-kit-download`) keeps
 * working either way; this is what gets them later versions.
 *
 *   node scripts/kit-backfill.mjs            # dry run: prints what it would do, writes nothing
 *   node scripts/kit-backfill.mjs --apply    # writes the orders and access links
 *   node scripts/kit-backfill.mjs --apply --send   # and emails each buyer their new link, once
 *
 * Reads paid Checkout Sessions stamped `metadata.product = production-kit`
 * from Stripe, skipping refunded ones. Idempotent: an order already recorded
 * (same session id) is left alone, and each email is sent with a Resend
 * idempotency key. Needs STRIPE_SECRET_KEY (the live one, for live buyers),
 * SUPABASE_URL, SUPABASE_SECRET_KEY, KIT_TOKEN_SECRET, and RESEND_API_KEY for
 * --send. SITE_ORIGIN defaults to https://anadithakur.in.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const root = join(import.meta.dirname, '..');
for (const f of ['.env.local', '.env']) if (existsSync(join(root, f))) process.loadEnvFile(join(root, f));

const apply = process.argv.includes('--apply');
const send = process.argv.includes('--send');
if (send && !apply) {
  console.error('--send needs --apply: a buyer is emailed only once their access exists.');
  process.exit(1);
}
const env = process.env;
for (const k of ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'KIT_TOKEN_SECRET', ...(send ? ['RESEND_API_KEY'] : [])]) {
  if (!env[k]) {
    console.error(`${k} must be set`);
    process.exit(1);
  }
}
const ORIGIN = env.SITE_ORIGIN || 'https://anadithakur.in';
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Same scheme as src/lib/kit/tokens.ts.
const deriveToken = (salt) => createHmac('sha256', env.KIT_TOKEN_SECRET).update(salt).digest('base64url');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

async function* paidKitSessions() {
  let after;
  for (;;) {
    const q = new URLSearchParams({ status: 'complete', limit: '100', 'expand[]': 'data.payment_intent.latest_charge' });
    if (after) q.set('starting_after', after);
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?${q}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    const body = await res.json();
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${body.error?.message}`);
    for (const s of body.data) if (s.metadata?.product === 'production-kit' && s.payment_status === 'paid') yield s;
    if (!body.has_more) return;
    after = body.data.at(-1).id;
  }
}

const rows = [];
for await (const s of paidKitSessions()) {
  const charge = s.payment_intent?.latest_charge;
  const refunded = Boolean(charge && (charge.refunded || charge.amount_refunded >= charge.amount));
  const email = s.customer_details?.email?.trim().toLowerCase();
  rows.push({ s, email, refunded });
}

const { data: known, error: knownErr } = await db.from('kit_orders').select('stripe_session_id').in('stripe_session_id', rows.map((r) => r.s.id));
if (knownErr) throw knownErr;
const already = new Set(known.map((k) => k.stripe_session_id));

console.log(`${rows.length} paid single-product sessions in Stripe\n`);
for (const { s, email, refunded } of rows) {
  const state = refunded ? 'skip (refunded)' : !email ? 'skip (no email)' : already.has(s.id) ? 'already recorded' : apply ? 'recording' : 'would record';
  console.log(`${new Date(s.created * 1000).toISOString().slice(0, 10)}  ${s.id}  ${email ?? '-'}  ${(s.amount_total / 100).toFixed(2)} ${s.currency.toUpperCase()}  ${state}`);
}
if (!apply) {
  console.log('\nDry run: nothing written. Run with --apply to record these, then --apply --send to email them.');
  process.exit(0);
}

const resend = send ? new Resend(env.RESEND_API_KEY) : null;
for (const { s, email, refunded } of rows) {
  if (refunded || !email) continue;
  if (!already.has(s.id)) {
    const { data: order, error } = await db
      .from('kit_orders')
      .insert({
        stripe_session_id: s.id,
        stripe_payment_intent: typeof s.payment_intent === 'object' ? s.payment_intent?.id : s.payment_intent,
        email,
        amount_total: s.amount_total,
        currency: s.currency,
        kind: 'purchase',
        status: 'paid',
        created_at: new Date(s.created * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;
    const { error: itemErr } = await db.from('kit_order_items').insert({ order_id: order.id, pack_id: 'full', amount: s.amount_total });
    if (itemErr) throw itemErr;
  }

  let { data: access } = await db.from('kit_access').select('token_salt').eq('email', email).maybeSingle();
  if (!access) {
    const salt = randomBytes(32).toString('base64url');
    const { error } = await db.from('kit_access').insert({ email, token_salt: salt, token_hash: hashToken(deriveToken(salt)) });
    if (error && error.code !== '23505') throw error;
    ({ data: access } = await db.from('kit_access').select('token_salt').eq('email', email).single());
  }
  const link = `${ORIGIN}/kit/downloads/${deriveToken(access.token_salt)}`;

  if (resend) {
    const text = [
      'Hi,',
      '',
      'You bought The Production Kit. It now comes as a downloads page, which has the latest version (1.2.0: seven skills, templates and a sample RLS audit) and will list any version I publish later:',
      '',
      link,
      '',
      'Your original download link still works too.',
      '',
      'Reply to this email if anything is unclear or broken.',
      '',
      'Anadi',
    ].join('\n');
    const sent = await resend.emails.send(
      { from: 'Anadi Thakur <rescue@anadithakur.in>', to: email, replyTo: env.RESCUE_INBOX || 'anadithakur99@gmail.com', subject: 'Your Production Kit downloads page', text },
      { idempotencyKey: `kit-backfill/${email}` },
    );
    if (sent.error) throw new Error(`resend ${email}: ${sent.error.message}`);
    console.log(`emailed ${email}`);
  } else {
    console.log(`${email}: ${link}`);
  }
}
console.log('\nDone.');
