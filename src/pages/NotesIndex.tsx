import { useState } from 'react';
import { c, display, heading, label, px, rule, s, stretch } from '@/components/portfolio/tokens';
import NotesShell, { Column } from '@/components/notes/NotesShell';
import FeedCard from '@/components/notes/FeedCard';
import { StartHere } from '@/components/notes/OnRamp';
import { Seo, ORIGIN, BYLINE } from '@/components/Seo';
import { pinnedPosts, posts } from '@/content';
import { STREAMS, streamLabel, type Stream } from '@/data/notes';
import { useDisclosureOpen } from '@/components/notes/useRail';

type Filter = 'all' | Stream;

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
  const railOpen = useDisclosureOpen();
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
      <Column
        wide
        rail={
          <details className="pf-rail" open={railOpen}>
            <summary className="pf-rail-summary">FILTER — {chips.find((chip) => chip.key === filter)?.label}</summary>
            <div className="pf-rail-body">
              <p
                className="pf-rail-stamp"
                style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[5]) }}
              >
                FILTER
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: s[2], alignItems: 'stretch' }}>
                {chips.map((chip) => {
                  const on = chip.key === filter;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFilter(chip.key)}
                      aria-pressed={on}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: s[3],
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
            </div>
          </details>
        }
      >
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
          Templates, build notes and AI dispatches. Whatever the piece promises is on the page in full — no signup, no
          gate, nothing held back for later.
        </p>

        {/* Only on the unfiltered feed. Someone who has narrowed to Dispatch has
            told us what they want, and three pinned drops is then an argument
            with the chip they just pressed. */}
        {filter === 'all' && <StartHere posts={pinnedPosts()} />}

        {shown.length === 0 ? (
          <p style={{ margin: px(s[10], 0), font: `400 17px/1.6 ${display}`, color: c.dim }}>
            Nothing in this stream yet. The other chips have the rest.
          </p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.edge}px solid ${c.ink}` }}>
            {shown.map((post) => (
              <FeedCard key={post.path} post={post} />
            ))}
          </ol>
        )}
      </Column>
    </NotesShell>
  );
};

export default NotesIndex;
