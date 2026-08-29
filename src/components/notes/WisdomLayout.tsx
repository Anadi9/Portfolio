import { c, display, heading, label, px, rule, s } from '@/components/portfolio/tokens';
import { ogImageFor, type WisdomPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import PostHeader from './PostHeader';
import Rail from './Rail';
import { payloadOf } from './streamPayload';
import { prose } from './prose';

/**
 * Builder Wisdom.
 *
 * The stream's signature is the tradeoff block: an argument that names no cost
 * is a pitch, so the layout reserves a dark plate for the cost and renders it
 * whether or not the writer felt like being honest that day. `moves` above it
 * are the numbered spine — what to actually do — so the page can be skimmed to
 * its conclusions and still be worth reading in full.
 */
const WisdomLayout = ({ post }: { post: WisdomPost }) => {
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
          <Standfirst>{post.summary}</Standfirst>
        </PostHeader>

        <ol style={{ listStyle: 'none', margin: px(0, 0, s[10]), padding: 0, borderTop: `${rule.base}px solid ${c.ink}` }}>
          {post.moves.map((move, i) => (
            <li
              key={move}
              style={{
                display: 'flex',
                gap: s[5],
                alignItems: 'baseline',
                padding: px(s[5], 0),
                borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)`,
              }}
            >
              <span style={{ ...heading('d6', { fixed: true }), color: c.markOnPaper, flex: 'none' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ font: `500 17px/1.5 ${display}`, color: c.ink }}>{move}</span>
            </li>
          ))}
        </ol>

        <Body components={prose} />

        <aside
          style={{
            marginTop: s[12],
            padding: s[8],
            background: c.plate,
            border: `${rule.base}px solid ${c.ink}`,
          }}
        >
          <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: px(0, 0, s[4]) }}>THE TRADEOFF</p>
          <p style={{ margin: 0, font: `400 18px/1.6 ${display}`, color: c.bright }}>{post.tradeoff}</p>
        </aside>
      </Column>
    </NotesShell>
  );
};

export default WisdomLayout;
