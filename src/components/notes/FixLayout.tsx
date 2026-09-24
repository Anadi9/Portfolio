import { c, label, mono, px, s } from '@/components/portfolio/tokens';
import { hasCover, ogImageFor, type FixPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import PostHeader from './PostHeader';
import Rail from './Rail';
import FixCta from './FixCta';
import { metaRowsOf } from './postMeta';
import { payloadOf } from './streamPayload';
import { prose } from './prose';

/**
 * Fixes.
 *
 * One failure mode of an AI-built app per post: what the founder sees, the
 * mechanism behind it, how to check, and the repair, with the real code. The
 * body does the work; the layout adds exactly one thing the other streams
 * don't have, which is `FixCta` under the last paragraph. Someone who read a
 * whole page about their broken deploy is the one reader on the site for whom
 * "I can fix this for you" is information rather than an interruption.
 */
const FixLayout = ({ post }: { post: FixPost }) => {
  const { Body } = post;

  return (
    <NotesShell post={post}>
      <Seo
        title={`${post.title} · ${BYLINE}`}
        description={post.summary}
        path={post.path}
        // No cover means no per-post card; `Seo` falls back to the site's own.
        image={hasCover(post) ? ogImageFor(post.path) : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          dateModified: post.lastVerified ?? post.date,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
          mainEntityOfPage: `${ORIGIN}${post.path}`,
        }}
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
          </Rail>
        }
      >
        <PostHeader post={post}>
          <MetaLine tag="USE WHEN">{post.useWhen}</MetaLine>
          <Standfirst>{post.summary}</Standfirst>
        </PostHeader>

        <Body components={prose} />

        <FixCta post={post} />
      </Column>
    </NotesShell>
  );
};

export default FixLayout;
