/**
 * A review from someone Anadi has worked with: what `/review` collects, what
 * `api/review.ts` accepts, and the notification email it sends.
 *
 * The page runs `parseReview` before sending and the server runs it again, so
 * the two can never disagree about what is acceptable.
 *
 * The photo arrives as a data URL the page has already shrunk to at most
 * `PHOTO_EDGE` px on its long side, so it fits comfortably inside a function's
 * 4.5 MB body limit. The server still checks the type and size itself.
 *
 * Pure and dependency-free, because `api/review.ts` loads it under Node's ESM
 * resolver as well as the browser loading it through Vite.
 */

export const REVIEW_MAX = 2000;
export const FIELD_MAX = 120;
export const PHOTO_EDGE = 512;
/** Decoded bytes. A 512px JPEG is well under this; anything bigger was not shrunk by the page. */
export const PHOTO_MAX_BYTES = 1_500_000;

export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type PhotoType = keyof typeof PHOTO_TYPES;

export type Photo = { type: PhotoType; bytes: Uint8Array };

export type Review = {
  rating: number;
  review: string;
  name: string;
  title: string;
  company: string | null;
  photo: Photo | null;
};

export type ReviewField = keyof Review;
export type Parsed = { ok: true; review: Review } | { ok: false; field: ReviewField; error: string };

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function decodeBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** `null` for a bad data URL; the caller turns that into an error. */
export function parsePhoto(raw: string): Photo | null {
  const m = DATA_URL.exec(raw);
  if (!m) return null;
  // Rough size before decoding, so a huge string is refused without allocating it.
  if ((m[2].length * 3) / 4 > PHOTO_MAX_BYTES) return null;
  const bytes = decodeBase64(m[2]);
  if (bytes.length === 0 || bytes.length > PHOTO_MAX_BYTES) return null;
  return { type: m[1] as PhotoType, bytes };
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

export function parseReview(body: unknown): Parsed {
  const b = (body ?? {}) as Record<string, unknown>;

  // In the form's order, so the field focused on an error is the topmost wrong one.
  const rating = b.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, field: 'rating', error: 'Pick a star rating.' };
  }

  const review = typeof b.review === 'string' ? b.review.trim() : '';
  if (!review) return { ok: false, field: 'review', error: 'Write a few words about working together.' };
  if (review.length > REVIEW_MAX) return { ok: false, field: 'review', error: `Keep it under ${REVIEW_MAX} characters.` };

  const name = text(b.name);
  if (!name) return { ok: false, field: 'name', error: 'Add your name.' };
  if (name.length > FIELD_MAX) return { ok: false, field: 'name', error: 'That name is too long.' };

  const title = text(b.title);
  if (!title) return { ok: false, field: 'title', error: 'Add your title or role.' };
  if (title.length > FIELD_MAX) return { ok: false, field: 'title', error: 'That title is too long.' };

  const company = text(b.company);
  if (company.length > FIELD_MAX) return { ok: false, field: 'company', error: 'That company name is too long.' };

  let photo: Photo | null = null;
  if (typeof b.photo === 'string' && b.photo) {
    photo = parsePhoto(b.photo);
    if (!photo) return { ok: false, field: 'photo', error: "That photo didn't work. Try a JPG or PNG." };
  }

  return { ok: true, review: { rating, review, name, title, company: company || null, photo } };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** The notification, to Anadi. The review is stored unapproved; this is the prompt to look at it. */
export function renderReviewEmail(r: Review, photoUrl: string | null): { subject: string; html: string } {
  const who = [r.title, r.company].filter(Boolean).join(', ');
  return {
    subject: `New review: ${stars(r.rating)} from ${r.name}`,
    html: `<div style="font:15px/1.55 Helvetica,Arial,sans-serif;color:#0a0a0a;max-width:560px">
<h2 style="margin:0 0 4px">${esc(r.name)}</h2>
<p style="margin:0 0 12px;color:#6b6b6b">${esc(who)}</p>
${photoUrl ? `<p><img src="${esc(photoUrl)}" alt="" width="96" height="96" style="object-fit:cover;border-radius:50%"></p>` : ''}
<p style="margin:0 0 12px;font-size:20px;color:#8A6A2A">${stars(r.rating)}</p>
<p style="white-space:pre-wrap">${esc(r.review)}</p>
<p style="color:#6b6b6b;font-size:13px">Saved to the <code>reviews</code> table as unapproved.</p>
</div>`,
  };
}
