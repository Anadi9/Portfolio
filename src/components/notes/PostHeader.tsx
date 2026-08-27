import { c, heading, label, px, rule, s } from '@/components/portfolio/tokens';
import { streamLabel, type Post } from '@/data/notes';

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

/**
 * Title block shared by all three streams.
 *
 * The H1 carries the search query, not the reel hook — that rule lives in the
 * content, but the layout has to give it the room to be long, which is why the
 * heading step here is `d4` and not the hero-sized `d1`.
 */
const PostHeader = ({ post, children }: { post: Post; children?: React.ReactNode }) => (
  <header style={{ marginBottom: s[9] }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], alignItems: 'center', marginBottom: s[6] }}>
      <span
        style={{
          padding: px(s[1], s[3]),
          background: c.accent,
          border: `${rule.hair}px solid ${c.ink}`,
          ...label(10, 700, 0.12),
          color: c.ink,
        }}
      >
        {streamLabel[post.stream]}
      </span>
      <time dateTime={post.date} style={{ ...label(10, 500, 0.14), color: c.dim }}>
        {fmtDate(post.date)}
      </time>
      {post.lastVerified && (
        // The cheat sheet ages by design. A visible stamp is the difference
        // between "dated on purpose" and "abandoned".
        <span style={{ ...label(10, 500, 0.14), color: c.markOnPaper }}>
          LAST VERIFIED {fmtDate(post.lastVerified)}
        </span>
      )}
    </div>

    <h1 style={{ margin: 0, ...heading('d4', { vw: true }), color: c.ink }}>{post.title}</h1>

    <div style={{ marginTop: s[6], paddingTop: s[5], borderTop: `${rule.base}px solid ${c.ink}` }}>{children}</div>
  </header>
);

export default PostHeader;
