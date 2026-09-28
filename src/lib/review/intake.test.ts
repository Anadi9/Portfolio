import { describe, expect, it } from 'vitest';
import { PHOTO_MAX_BYTES, parsePhoto, parseReview, renderReviewEmail, stars, toPublicReview } from './intake';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const valid = () => ({
  rating: 5,
  review: '  Shipped our auth rewrite in a week.  ',
  name: '  Priya   Shah ',
  title: 'CTO',
  company: '',
  photo: '',
});

describe('parseReview', () => {
  it('accepts and tidies a valid review', () => {
    const r = parseReview(valid());
    expect(r).toEqual({
      ok: true,
      review: { rating: 5, review: 'Shipped our auth rewrite in a week.', name: 'Priya Shah', title: 'CTO', company: null, photo: null },
    });
  });

  it.each([0, 6, 3.5, '5', undefined])('rejects rating %s', (rating) => {
    expect(parseReview({ ...valid(), rating })).toMatchObject({ ok: false, field: 'rating' });
  });

  it('requires the review, name and title, in form order', () => {
    expect(parseReview({ ...valid(), review: '  ', name: '' })).toMatchObject({ ok: false, field: 'review' });
    expect(parseReview({ ...valid(), name: '' })).toMatchObject({ ok: false, field: 'name' });
    expect(parseReview({ ...valid(), title: ' ' })).toMatchObject({ ok: false, field: 'title' });
  });

  it('keeps an optional company', () => {
    const r = parseReview({ ...valid(), company: ' Acme ' });
    expect(r.ok && r.review.company).toBe('Acme');
  });

  it('caps the review length', () => {
    expect(parseReview({ ...valid(), review: 'x'.repeat(2001) })).toMatchObject({ ok: false, field: 'review' });
  });

  it('decodes a photo and refuses anything else', () => {
    const r = parseReview({ ...valid(), photo: PNG });
    expect(r.ok && r.review.photo?.type).toBe('image/png');
    expect(parseReview({ ...valid(), photo: 'data:image/svg+xml;base64,PHN2Zz4=' })).toMatchObject({ ok: false, field: 'photo' });
    expect(parseReview({ ...valid(), photo: 'https://example.com/a.png' })).toMatchObject({ ok: false, field: 'photo' });
  });
});

describe('parsePhoto', () => {
  it('refuses one over the size cap without decoding it', () => {
    expect(parsePhoto(`data:image/jpeg;base64,${'A'.repeat(Math.ceil((PHOTO_MAX_BYTES * 4) / 3) + 8)}`)).toBeNull();
  });
});

describe('renderReviewEmail', () => {
  it('escapes what the reviewer typed', () => {
    const r = parseReview({ ...valid(), name: '<b>x</b>', review: '<script>' });
    if (!r.ok) throw new Error('expected valid');
    const { subject, html } = renderReviewEmail(r.review, null);
    expect(subject).toBe(`New review: ${stars(5)} from <b>x</b>`);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('toPublicReview', () => {
  const row = { id: 'a', rating: 4, review: 'Good', name: 'P', title: 'CTO', company: null, photo_path: 'x y.jpg' };
  it('turns a photo path into its public bucket URL', () => {
    expect(toPublicReview(row, 'https://abc.supabase.co/')).toEqual({
      id: 'a', rating: 4, review: 'Good', name: 'P', title: 'CTO', company: null,
      photoUrl: 'https://abc.supabase.co/storage/v1/object/public/review-photos/x%20y.jpg',
    });
  });
  it('leaves no photo as null', () => {
    expect(toPublicReview({ ...row, photo_path: null }, 'https://abc.supabase.co').photoUrl).toBeNull();
  });
});
