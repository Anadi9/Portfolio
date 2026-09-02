import { Link } from 'vite-react-ssg';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { coverFor, readingMinutes, streamLabel, type Post } from '@/data/notes';
import { formatChip, payloadOf } from './streamPayload';

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

/** Bordered mono chip. Reads on paper and on ink without changing shape. */
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      padding: px(s[1], s[3]),
      border: `${rule.hair}px solid var(--fc-chip-edge)`,
      ...label(10, 700, 0.12),
      color: 'var(--fc-ink)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

/**
 * One row of the feed.
 *
 * Three streams, one skeleton (eyebrow, headline, `useWhen`) and then a
 * payload block that differs per stream. The skeleton is what keeps the feed
 * reading as one feed; the payload is what stops twelve rows looking like the
 * same row twelve times. Which field goes in the payload is decided in
 * `streamPayload.ts`, so the START HERE strip can make the same promise in a
 * quarter of the space.
 *
 * `useWhen` sits where `summary` used to. Both are one line under a headline,
 * but `summary` is written for a meta description and does its real work in
 * `<Seo>`; `useWhen` is written as "reach for this when…", which is the
 * question a reader arriving from a reel is actually asking.
 */
const FeedCard = ({ post }: { post: Post }) => {
  const payload = payloadOf(post);
  const minutes = readingMinutes(post);
  const chip = formatChip(post);

  return (
    <li style={{ borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
      <Link
        to={post.path}
        className="pf-feed-card"
        style={{
          display: 'block',
          padding: px(s[8], 20),
          margin: px(0, -20),
          textDecoration: 'none',
          color: 'var(--fc-ink)',
        }}
      >
        <div className="pf-feed-row">
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], marginBottom: s[4] }}>
              <span style={{ ...label(10, 700, 0.12), color: 'var(--fc-mark)' }}>{streamLabel[post.stream]}</span>
              <time dateTime={post.date} style={{ ...label(10, 500, 0.14), color: 'var(--fc-dim)' }}>
                {fmtDate(post.date)}
              </time>
              {minutes !== null && (
                <span style={{ ...label(10, 500, 0.14), color: 'var(--fc-dim)' }}>{minutes} MIN READ</span>
              )}
              {post.draft && <span style={{ ...label(10, 700, 0.12), color: c.signal }}>DRAFT</span>}
            </div>

            <h2 style={{ margin: 0, ...heading('d5', { vw: true }), color: 'var(--fc-ink)' }}>{post.title}</h2>

            <p
              style={{
                margin: px(s[4], 0, 0),
                maxWidth: 560,
                font: `500 12px/1.6 ${mono}`,
                letterSpacing: '0.04em',
                color: 'var(--fc-dim)',
              }}
            >
              <span style={{ ...label(10, 700, 0.14), color: 'var(--fc-mark)', marginRight: s[3] }}>USE WHEN</span>
              {post.useWhen}
            </p>

            {/* The payload block. A drop puts the artifact on a plate; a wisdom
                post leads with the cost of taking its advice; a dispatch shows the
                story and says how many more are behind it. */}
            <div
              style={{
                marginTop: s[5],
                padding: px(s[4], s[5]),
                background: 'var(--fc-plate)',
                borderLeft: `${rule.base}px solid var(--fc-mark)`,
                transition: 'background 0.22s ease',
              }}
            >
              <p style={{ ...label(10, 700, 0.14), color: 'var(--fc-mark)', margin: px(0, 0, s[2]) }}>{payload.tag}</p>
              <p
                className="pf-clamp-2"
                style={{ margin: 0, font: `500 16px/1.45 ${display}`, color: 'var(--fc-plate-ink)' }}
              >
                {payload.line}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], marginTop: s[5] }}>
              {chip && <Chip>{chip}</Chip>}
              {payload.more && <Chip>{payload.more}</Chip>}
              {post.lastVerified && (
                <span
                  style={{
                    padding: px(s[1], 0),
                    ...label(10, 500, 0.14),
                    color: 'var(--fc-dim)',
                    alignSelf: 'center',
                  }}
                >
                  VERIFIED {fmtDate(post.lastVerified)}
                </span>
              )}
            </div>
          </div>

        {/* The cover, cropped by the same scrim the post page uses. Lazy and
            low priority: twelve of these sit below one another on the index and
            none of them is what the reader came for. */}
        <div className="pf-feed-media">
          <img
            {...coverFor(post.path)}
            sizes="(min-width: 880px) 300px, 100vw"
            alt=""
            aria-hidden="true"
            width={480}
            height={253}
            loading="lazy"
            decoding="async"
          />
        </div>
        </div>
      </Link>
    </li>
  );
};

export default FeedCard;
