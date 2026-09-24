import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { hasCover, ogImageFor, type DropPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo } from '@/components/Seo';
import { articleJsonLd, headOf } from './postSeo';
import PostHeader from './PostHeader';
import Rail from './Rail';
import { metaRowsOf } from './postMeta';
import { payloadOf } from './streamPayload';
import { prose } from './prose';

/**
 * Resource Drop.
 *
 * The artifact is the page. Whatever the format says, the body renders inline
 * indexable text; a download link is an extra way to take it away, never the
 * only way to read it, because a page whose content is a file is a page with no
 * content as far as search is concerned.
 */
const DropLayout = ({ post }: { post: DropPost }) => {
  const { Body } = post;

  return (
    <NotesShell post={post}>
      <Seo
        {...headOf(post)}
        path={post.path}
        image={hasCover(post) ? ogImageFor(post.path) : undefined}
        jsonLd={articleJsonLd(post, 'Article')}
      />
      <Column
        rail={
          <Rail stamp={payloadOf(post).stamp} headings={post.headings} post={post}>
            {metaRowsOf(post).map((row) => (
              <div key={row.tag} style={{ marginBottom: s[4] }}>
                <p style={{ ...label(9, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[1]) }}>{row.tag}</p>
                <p style={{ margin: 0, font: `500 12px/1.5 ${mono}`, color: c.ink }}>{row.value}</p>
              </div>
            ))}

            {post.format !== 'inline' && post.downloadHref && (
              <a
                href={post.downloadHref}
                className="pf-nudge"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: s[4],
                  padding: px(s[3], s[4]),
                  background: c.ink,
                  color: c.accent,
                  ...label(10, 700, 0.12),
                  textDecoration: 'none',
                }}
              >
                DOWNLOAD THE FILE →
              </a>
            )}
          </Rail>
        }
      >
        <PostHeader post={post}>
          <MetaLine tag="USE WHEN">{post.useWhen}</MetaLine>
          <Standfirst>{post.summary}</Standfirst>
        </PostHeader>

        <Body components={prose} />

        <aside
          style={{
            marginTop: s[12],
            padding: s[8],
            background: c.accent,
            border: `${rule.base}px solid ${c.ink}`,
          }}
        >
          <p style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[3]) }}>NOTHING IS GATED</p>
          <p style={{ margin: 0, font: `400 16px/1.6 ${display}`, color: c.ink }}>
            The whole thing is on this page: no signup, no email wall, no follow-up sequence. If it saved you an
            afternoon, that was the job. More of these land here as I build them.
          </p>
        </aside>
      </Column>
    </NotesShell>
  );
};

export default DropLayout;
