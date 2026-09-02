import { Link } from 'vite-react-ssg';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { streamLabel, type Post } from '@/data/notes';
import { payloadOf } from './streamPayload';
import { MEASURE } from './prose';

/**
 * The compact card both on-ramps use.
 *
 * Same `pf-feed-card` custom properties as the feed row, so it inverts to ink
 * on hover with no extra CSS, plus `--tile` for a filled ground on the cream
 * band. It shows the stamp, the headline and the same payload line the feed row
 * puts on a plate: a quarter of the space, the same promise.
 */
const MiniCard = ({ post, index }: { post: Post; index?: number }) => {
  const payload = payloadOf(post);

  return (
    <Link
      to={post.path}
      className="pf-feed-card pf-feed-card--tile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: s[3],
        padding: s[6],
        textDecoration: 'none',
        color: 'var(--fc-ink)',
        border: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: s[3] }}>
        {index !== undefined && (
          <span style={{ ...heading('d6', { fixed: true }), fontSize: 20, color: 'var(--fc-mark)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <span style={{ ...label(10, 700, 0.12), color: 'var(--fc-mark)' }}>
          {post.stream === 'drop' ? payload.stamp : streamLabel[post.stream]}
        </span>
      </div>

      <h3
        className="pf-clamp-3"
        style={{ margin: 0, font: `700 19px/1.25 ${display}`, letterSpacing: '-0.02em', color: 'var(--fc-ink)' }}
      >
        {post.title}
      </h3>

      <p
        className="pf-clamp-2"
        style={{ margin: 0, font: `500 12px/1.55 ${mono}`, letterSpacing: '0.03em', color: 'var(--fc-dim)' }}
      >
        {payload.line}
      </p>

      <span style={{ marginTop: 'auto', paddingTop: s[3], ...label(10, 700, 0.14), color: 'var(--fc-mark)' }}>
        OPEN →
      </span>
    </Link>
  );
};

/**
 * Three pinned entry points, above the feed.
 *
 * A reverse-chron list answers "what is newest", and nobody arriving from a
 * reel is asking that. They're asking which one to open first, and twelve rows
 * of equal weight refuse to answer. These three do, in the order the work
 * actually happens: decide, then prompt, then automate.
 */
export const StartHere = ({ posts }: { posts: Post[] }) => {
  if (posts.length === 0) return null;

  return (
    <section
      style={{
        margin: px(0, 0, s[10]),
        padding: s[7],
        background: c.accent,
        border: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], alignItems: 'baseline', marginBottom: s[6] }}>
        <h2 style={{ margin: 0, ...label(11, 700, 0.16), color: c.ink }}>START HERE</h2>
        <p style={{ margin: 0, font: `400 14px/1.5 ${display}`, color: '#4a4238' }}>
          New here? These three, in this order.
        </p>
      </div>

      <div className="pf-onramp pf-onramp--3">
        {posts.map((post, i) => (
          <MiniCard key={post.path} post={post} index={i} />
        ))}
      </div>
    </section>
  );
};

/**
 * Two follow-on reads, at the foot of every post.
 *
 * Before this, every post dead-ended on its closing aside and the only way on
 * was the back button, which means one read never became two. Cross-stream by
 * default (see `relatedTo`) so a template hands off to the argument behind it
 * rather than to another template.
 */
export const NextUp = ({ posts }: { posts: Post[] }) => {
  if (posts.length === 0) return null;

  return (
    <section
      style={{
        borderTop: `${rule.edge}px solid ${c.ink}`,
        background: c.accent,
        padding: px(s[10], 0),
        paddingLeft: 'clamp(20px, 5vw, 40px)',
        paddingRight: 'clamp(20px, 5vw, 40px)',
      }}
    >
      <div style={{ maxWidth: MEASURE, margin: '0 auto' }}>
        <h2 style={{ margin: px(0, 0, s[6]), ...label(11, 700, 0.16), color: c.markOnPaper }}>READ NEXT</h2>
        <div className="pf-onramp pf-onramp--2">
          {posts.map((post) => (
            <MiniCard key={post.path} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};
