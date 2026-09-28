import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PHOTO_BUCKET, PHOTO_TYPES, parseReview, renderReviewEmail, toPublicReview, type ReviewRow } from '../src/lib/review/intake.js';

/**
 * GET /api/review: the approved reviews, newest first, for `<Testimonials />`.
 * Cached at the CDN for a minute, so approving a row shows up within one
 * without every page view reaching Supabase.
 *
 * POST /api/review: the `/review` form. The row in `reviews` is the review itself, so it must
 * land or the visitor is told it failed. The photo goes first, so the row can
 * name it; a row that then fails to insert leaves an orphaned photo, which is
 * harmless. The email to Anadi goes last and a failure there is logged, not
 * surfaced: the review has already landed.
 *
 * Every review is stored with `approved = false`. Nothing is shown anywhere
 * until Anadi flips it.
 *
 * Imports carry explicit `.js` extensions; `serverless-imports.test.ts` asserts it.
 */

const FROM = 'Anadi Thakur <rescue@anadithakur.in>';
const INBOX_FALLBACK = 'anadithakur99@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.warn('[review] Supabase not configured');
    return res.status(501).json({ error: 'storage not configured' });
  }

  if (req.method === 'GET') {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db
      .from('reviews')
      .select('id, rating, review, name, title, company, photo_path')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[review] list failed', error);
      return res.status(502).json({ error: 'list failed' });
    }
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).json({ reviews: (data as ReviewRow[]).map((r) => toPublicReview(r, url)) });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;

  // Honeypot: the same silent 200 a person gets.
  const hp = (body as { hp?: unknown } | null)?.hp;
  if (typeof hp === 'string' && hp.length > 0) {
    return res.status(200).json({ ok: true });
  }

  const parsed = parseReview(body);
  if (parsed.ok === false) {
    return res.status(400).json({ error: parsed.error, field: parsed.field });
  }

  const { review } = parsed;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let photoPath: string | null = null;
  let photoUrl: string | null = null;
  if (review.photo) {
    photoPath = `${crypto.randomUUID()}.${PHOTO_TYPES[review.photo.type]}`;
    const up = await db.storage.from(PHOTO_BUCKET).upload(photoPath, review.photo.bytes, { contentType: review.photo.type });
    if (up.error) {
      console.error('[review] photo upload failed', up.error);
      return res.status(502).json({ error: 'save failed' });
    }
    photoUrl = db.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
  }

  const { error } = await db.from('reviews').insert({
    rating: review.rating,
    review: review.review,
    name: review.name,
    title: review.title,
    company: review.company,
    photo_path: photoPath,
  });
  if (error) {
    console.error('[review] insert failed', error);
    return res.status(502).json({ error: 'save failed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const mail = renderReviewEmail(review, photoUrl);
    try {
      const sent = await new Resend(resendKey).emails.send({
        from: FROM,
        to: process.env.RESCUE_INBOX || INBOX_FALLBACK,
        subject: mail.subject,
        html: mail.html,
      });
      if (sent.error) console.warn('[review] notification failed', sent.error);
    } catch (err) {
      console.warn('[review] notification threw', err);
    }
  }

  return res.status(200).json({ ok: true });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
