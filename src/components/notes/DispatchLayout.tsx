import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import type { DispatchPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import PostHeader from './PostHeader';
import { prose } from './prose';

/**
 * Dispatch.
 *
 * Dated by nature, so the layout leads with the dateline and puts every item's
 * "why it matters" directly under its headline. A dispatch that only lists
 * headlines is a feed reader, and nobody needs another one — the second line is
 * the entire reason the page exists.
 */
const DispatchLayout = ({ post }: { post: DispatchPost }) => {
  const { Body } = post;

  return (
    <NotesShell>
      <Seo
        title={`${post.title} — ${BYLINE}`}
        description={post.summary}
        path={post.path}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
          mainEntityOfPage: `${ORIGIN}${post.path}`,
        }}
      />
      <Column>
        <PostHeader post={post}>
          <MetaLine tag="DATELINE">{post.dateline}</MetaLine>
          <Standfirst>{post.summary}</Standfirst>
        </PostHeader>

        <ol style={{ listStyle: 'none', margin: px(0, 0, s[10]), padding: 0 }}>
          {post.items.map((item, i) => (
            <li key={item.headline} style={{ paddingBottom: s[7], marginBottom: s[7], borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
              <p style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[3]) }}>
                {String(i + 1).padStart(2, '0')}
              </p>
              <h2 style={{ margin: px(0, 0, s[3]), font: `700 22px/1.25 ${display}`, color: c.ink }}>{item.headline}</h2>
              <p style={{ margin: 0, font: `400 16px/1.6 ${display}`, color: '#3a3a3a' }}>{item.why}</p>
            </li>
          ))}
        </ol>

        <Body components={prose} />
      </Column>
    </NotesShell>
  );
};

export default DispatchLayout;
