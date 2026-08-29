import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import { ogImageFor, type DropPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import PostHeader from './PostHeader';
import Rail from './Rail';
import { payloadOf } from './streamPayload';
import { prose } from './prose';

/**
 * Resource Drop.
 *
 * The artifact is the page. Whatever the format says, the body renders inline
 * indexable text — a download link is an extra way to take it away, never the
 * only way to read it, because a page whose content is a file is a page with no
 * content as far as search is concerned.
 */
const DropLayout = ({ post }: { post: DropPost }) => {
  const { Body } = post;

  return (
    <NotesShell post={post}>
      <Seo
        title={`${post.title} — ${BYLINE}`}
        description={post.summary}
        path={post.path}
        image={ogImageFor(post.path)}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          dateModified: post.lastVerified ?? post.date,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
          mainEntityOfPage: `${ORIGIN}${post.path}`,
        }}
      />
      <Column rail={<Rail stamp={payloadOf(post).stamp} headings={post.headings} />}>
        <PostHeader post={post}>
          <MetaLine tag="USE WHEN">{post.useWhen}</MetaLine>
          <MetaLine tag="YOU GET">{post.artifact}</MetaLine>
          <Standfirst>{post.summary}</Standfirst>

          {post.format !== 'inline' && post.downloadHref && (
            <a
              href={post.downloadHref}
              className="pf-nudge"
              style={{
                display: 'inline-block',
                marginTop: s[7],
                padding: px(s[4], s[6]),
                background: c.ink,
                color: c.accent,
                ...label(11, 700, 0.12),
                textDecoration: 'none',
              }}
            >
              DOWNLOAD THE FILE →
            </a>
          )}
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
            The whole thing is on this page — no signup, no email wall, no follow-up sequence. If it saved you an
            afternoon, that was the job. More of these land here as I build them.
          </p>
        </aside>
      </Column>
    </NotesShell>
  );
};

export default DropLayout;
