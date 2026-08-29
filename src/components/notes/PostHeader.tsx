import Banner from './Banner';
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
 *
 * Eyebrow, date, headline and whatever lede the layout passes as children.
 * Nothing else: YOU GET, LAST VERIFIED, the DM keyword and the download link
 * are reference rather than lede, and they live in the rail now. Six lines of
 * apparatus before the first sentence was five too many.
 */
const PostHeader = ({ post, children }: { post: Post; children?: React.ReactNode }) => (
  <header style={{ marginBottom: s[9] }}>
    <Banner post={post} />
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
    </div>

    <h1 style={{ margin: 0, ...heading('d4', { vw: true }), color: c.ink }}>{post.title}</h1>

    <div style={{ marginTop: s[6], paddingTop: s[5], borderTop: `${rule.base}px solid ${c.ink}` }}>{children}</div>
  </header>
);

export default PostHeader;
