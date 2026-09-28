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
 */

const FIRST = 6;
/** Past this, a card clamps to `CLAMP_LINES` and offers to expand. */
const LONG = 320;
const CLAMP_LINES = 7;

const p = { ink: c.ink, body: '#4a4a4a', dim: c.dim, gold: c.markOnPaper, rule: 'rgba(10,10,10,.14)' } as const;

const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: p.gold, margin: 0 };
const textButton: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  ...label(11, 700, 0.14),
  color: p.ink,
  cursor: 'pointer',
  justifySelf: 'start',
};

const Stars = ({ n, size = 16 }: { n: number; size?: number }) => (
  <span role="img" aria-label={`${n} out of 5 stars`} style={{ display: 'inline-flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={i <= n ? c.mark : 'none'} stroke={i <= n ? c.markOnPaper : c.accentEdge} strokeWidth={1.6} strokeLinejoin="round">
        <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
      </svg>
    ))}
  </span>
);

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

const Card = ({ r }: { r: PublicReview }) => {
  const long = r.review.length > LONG;
  const [open, setOpen] = useState(false);
  const clamped = long && !open;
  return (
    <figure style={{ margin: 0, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: s[5], padding: px(s[7], s[6]), background: '#fff', border: `${rule.base}px solid ${c.ink}`, minWidth: 0 }}>
      <Stars n={r.rating} />
      <div style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
        <blockquote
          style={{
            margin: 0,
            font: `400 16px/1.55 ${display}`,
            color: p.ink,
            whiteSpace: 'pre-line',
            textWrap: 'pretty',
            ...(clamped ? { display: '-webkit-box', WebkitLineClamp: CLAMP_LINES, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
          }}
        >
          {r.review}
        </blockquote>
        {long && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="pf-underline" style={{ ...textButton, color: p.dim }}>
            {open ? 'SHOW LESS' : 'READ MORE'}
          </button>
        )}
      </div>
      <figcaption style={{ display: 'flex', alignItems: 'center', gap: s[4], paddingTop: s[5], borderTop: `${rule.hair}px solid ${p.rule}` }}>
        <Avatar r={r} />
        <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <span style={{ font: `600 15px/1.3 ${display}`, color: p.ink }}>{r.name}</span>
          <span style={{ font: `400 13px/1.4 ${display}`, color: p.dim }}>{[r.title, r.company].filter(Boolean).join(' · ')}</span>
        </span>
      </figcaption>
    </figure>
  );
};

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

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
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
          <p style={eyebrow}>REVIEWS · {reviews.length}</p>
          <h2 id="h-testimonials" style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>
            From people I&apos;ve <span style={{ color: p.gold }}>worked with</span>
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: s[3] }}>
          <Stars n={Math.round(avg)} size={20} />
          <span style={{ font: `600 15px/1 ${display}`, color: p.ink }}>{avg.toFixed(1)}</span>
          <span style={{ font: `400 14px/1 ${display}`, color: p.dim }}>
            from {reviews.length} review{reviews.length === 1 ? '' : 's'}
          </span>
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
