import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import type { PublicReview } from '@/lib/review/intake';

/**
 * Approved reviews from `/review`, on the homepage and the portfolio.
 *
 * Loaded after mount from `GET /api/review` rather than baked in at build, so
 * approving a row in Supabase is all it takes for a review to appear (within
 * the minute the CDN caches the list). The prerendered HTML carries nothing:
 * until reviews arrive, and if there are none or the request fails, the
 * section does not render at all, so a page never shows an empty "reviews"
 * heading.
 *
 * No star ratings or average: these are colleagues and clients vouching for
 * the person, and a 5.0 over a handful of hand-collected reviews reads as
 * inflated. Quotes run in full rather than clamping, since a clamp's ellipsis
 * after a full stop looks like the review was cut.
 */

const FIRST = 6;

const p = { ink: c.ink, body: '#4a4a4a', dim: c.dim, gold: c.markOnPaper, rule: 'rgba(10,10,10,.14)' } as const;

const textButton: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  ...label(11, 700, 0.14),
  color: p.ink,
  cursor: 'pointer',
  justifySelf: 'start',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

const Avatar = ({ r }: { r: PublicReview }) =>
  r.photoUrl ? (
    <img src={r.photoUrl} alt="" width={48} height={48} loading="lazy" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `${rule.hair}px solid ${c.ink}` }} />
  ) : (
    <span aria-hidden style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: c.accent, ...label(12, 700, 0.06), color: p.ink }}>
      {initials(r.name)}
    </span>
  );

const Card = ({ r }: { r: PublicReview }) => (
  <figure style={{ margin: 0, display: 'grid', gridTemplateRows: '1fr auto', gap: s[5], padding: px(s[7], s[6]), background: '#fff', border: `${rule.base}px solid ${c.ink}`, minWidth: 0 }}>
    <blockquote
      style={{
        margin: 0,
        font: `400 16px/1.55 ${display}`,
        color: p.ink,
        whiteSpace: 'pre-line',
        textWrap: 'pretty',
      }}
    >
      {r.review}
    </blockquote>
    <figcaption style={{ display: 'flex', alignItems: 'center', gap: s[4], paddingTop: s[5], borderTop: `${rule.hair}px solid ${p.rule}` }}>
      <Avatar r={r} />
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span style={{ font: `600 15px/1.3 ${display}`, color: p.ink }}>{r.name}</span>
        <span style={{ font: `400 13px/1.4 ${display}`, color: p.dim }}>{[r.title, r.company].filter(Boolean).join(' · ')}</span>
      </span>
    </figcaption>
  </figure>
);

export default function Testimonials({ hpadAttr = {} }: { hpadAttr?: Record<string, string> }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/review', { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reviews?: PublicReview[] } | null) => setReviews(data?.reviews ?? []))
      .catch(() => {
        if (!ctrl.signal.aborted) setReviews([]);
      });
    return () => ctrl.abort();
  }, []);

  if (!reviews?.length) return null;

  const shown = all ? reviews : reviews.slice(0, FIRST);

  return (
    <section
      id="testimonials"
      aria-labelledby="h-testimonials"
      {...hpadAttr}
      style={{ containerType: 'inline-size', background: c.paper, color: p.ink, borderTop: `${rule.edge}px solid ${p.rule}`, padding: px(sectionY.top, gutter, sectionY.bottom) }}
    >
      <div data-testimonials-head style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: s[6], marginBottom: s[9] }}>
        <div style={{ display: 'grid', gap: s[5] }}>
          <h2 id="h-testimonials" style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>
            From people I&apos;ve <span style={{ color: p.gold }}>worked with</span>
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: s[6], alignItems: 'stretch' }}>
        {shown.map((r) => (
          <Card key={r.id} r={r} />
        ))}
      </div>

      {reviews.length > FIRST && (
        <div style={{ marginTop: s[8] }}>
          <button type="button" onClick={() => setAll((a) => !a)} className="pf-underline" style={textButton}>
            {all ? 'SHOW FEWER' : `SHOW ALL ${reviews.length} REVIEWS →`}
          </button>
        </div>
      )}
    </section>
  );
}
