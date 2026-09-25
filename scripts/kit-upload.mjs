#!/usr/bin/env node
/**
 * Uploads a kit release's zips to the private Supabase bucket, at
 * `kit/<version>/<zip>` in `products`.
 *
 *   node scripts/kit-upload.mjs ~/Downloads/production-kit/release/dist/1.2.0
 *
 * Each zip's sha256 is checked against the manifest before it goes up, and a
 * file already in the bucket is never overwritten: old versions stay, and a
 * version, once sold, doesn't change under its buyers. Needs SUPABASE_URL and
 * SUPABASE_SECRET_KEY (read from .env.local if not set).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'products';

const root = join(import.meta.dirname, '..');
for (const f of ['.env.local', '.env']) if (existsSync(join(root, f))) process.loadEnvFile(join(root, f));

const dir = process.argv[2] && resolve(process.argv[2]);
if (!dir) {
  console.error('usage: node scripts/kit-upload.mjs <release folder containing manifest.json and the zips>');
  process.exit(1);
}
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let failed = false;
for (const pack of manifest.packs) {
  const bytes = readFileSync(join(dir, pack.zip));
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== pack.sha256 || bytes.length !== pack.bytes) {
    console.error(`✗ ${pack.zip}: sha256 or size doesn't match the manifest. Not uploaded.`);
    failed = true;
    continue;
  }
  const path = `kit/${manifest.version}/${pack.zip}`;
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/zip', upsert: false });
  if (!error) console.log(`✓ ${path} (${bytes.length} bytes, sha256 ok)`);
  else if (/exists|duplicate/i.test(error.message)) console.log(`· ${path} already uploaded, left as is`);
  else {
    console.error(`✗ ${path}: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
