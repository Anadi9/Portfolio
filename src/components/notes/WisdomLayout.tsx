import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { hasCover, ogImageFor, type WisdomPost } from '@/data/notes';
import NotesShell, { Column, MetaLine, Standfirst } from './NotesShell';
import { Seo } from '@/components/Seo';
import { articleJsonLd, headOf } from './postSeo';
import PostHeader from './PostHeader';
import Rail from './Rail';
import { metaRowsOf } from './postMeta';
import { payloadOf } from './streamPayload';
import { prose } from './prose';

/**
 * Builder Wisdom.
 *
 * The stream's signature is the tradeoff block: an argument that names no cost
 * is a pitch, so the layout reserves a dark plate for the cost and renders it
 * whether or not the writer felt like being honest that day. `moves` above it
 * are the numbered spine, what to actually do, so the page can be skimmed to
 * its conclusions and still be worth reading in full.
 */
const WisdomLayout = ({ post }: { post: WisdomPost }) => {
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
          </Rail>
        }
      >
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
