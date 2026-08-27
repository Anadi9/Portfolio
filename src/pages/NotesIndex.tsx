import { useState } from 'react';
import { Link } from 'vite-react-ssg';
import { c, display, heading, label, px, rule, s, stretch } from '@/components/portfolio/tokens';
import NotesShell, { Column } from '@/components/notes/NotesShell';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import { posts } from '@/content';
import { STREAMS, streamLabel, type Stream } from '@/data/notes';

type Filter = 'all' | Stream;

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

const DESCRIPTION =
  'Free, ungated resources, build notes and AI dispatches from Anadi Thakur — automation templates, system-design worksheets and the reasoning behind them.';

/**
 * One reverse-chron feed with filter chips, not three columns.
 *
 * Wisdom will sit at zero or two posts for a while, and an empty column reads
 * as neglect where the same two posts inside a working feed read as a feed.
 * The chips are client state on top of a fully prerendered list, so every post
 * is in the static HTML whichever chip is selected.
 */
const NotesIndex = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? posts : posts.filter((p) => p.stream === filter);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'ALL', count: posts.length },
    ...STREAMS.map((stream) => ({
      key: stream as Filter,
      label: streamLabel[stream],
      count: posts.filter((p) => p.stream === stream).length,
    })),
  ];

  return (
    <NotesShell>
      <Seo
        title={`Notes — ${BYLINE}`}
        description={DESCRIPTION}
        path="/notes"
        type="blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Notes — Anadi Thakur',
          description: DESCRIPTION,
          url: `${ORIGIN}/notes`,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
        }}
      />
      <Column>
        <h1
          style={{
            margin: 0,
            ...heading('d2', { stretch: stretch.bleed, vw: true }),
            color: c.ink,
            textTransform: 'uppercase',
          }}
        >
          Notes
        </h1>
        <p style={{ margin: px(s[6], 0, s[9]), maxWidth: 620, font: `400 19px/1.55 ${display}`, color: '#3a3a3a' }}>
          Templates, build notes and AI dispatches. Everything is on the page — nothing behind an email form, nothing
          behind a DM.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: s[2],
            paddingBottom: s[6],
            borderBottom: `${rule.edge}px solid ${c.ink}`,
          }}
        >
          {chips.map((chip) => {
            const on = chip.key === filter;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                aria-pressed={on}
                style={{
                  padding: px(s[2], s[4]),
                  background: on ? c.ink : 'transparent',
                  color: on ? c.accent : c.ink,
                  border: `${rule.hair}px solid ${c.ink}`,
                  ...label(10, 700, 0.12),
                  cursor: 'pointer',
                }}
              >
                {chip.label} <span style={{ color: on ? c.mark : c.dim }}>{chip.count}</span>
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <p style={{ margin: px(s[10], 0), font: `400 17px/1.6 ${display}`, color: c.dim }}>
            Nothing in this stream yet. The other chips have the rest.
          </p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.map((post) => (
              <li key={post.path} style={{ borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
                <Link
                  to={post.path}
                  className="pf-nudge"
                  style={{ display: 'block', padding: px(s[8], 0), textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], marginBottom: s[4] }}>
                    <span style={{ ...label(10, 700, 0.12), color: c.markOnPaper }}>{streamLabel[post.stream]}</span>
                    <time dateTime={post.date} style={{ ...label(10, 500, 0.14), color: c.dim }}>
                      {fmtDate(post.date)}
                    </time>
                    {post.draft && <span style={{ ...label(10, 700, 0.12), color: c.signal }}>DRAFT</span>}
                  </div>
                  <h2 style={{ margin: 0, ...heading('d5', { vw: true }), color: c.ink }}>{post.title}</h2>
                  <p style={{ margin: px(s[3], 0, 0), maxWidth: 620, font: `400 16px/1.6 ${display}`, color: '#3a3a3a' }}>
                    {post.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Column>
    </NotesShell>
  );
};

export default NotesIndex;
