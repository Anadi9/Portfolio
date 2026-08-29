import { useMemo, useState } from 'react';
import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { AUDIENCE_LABEL, CATEGORIES, PROMPTS, type Audience, type Prompt } from '@/data/prompts';
import { EMPTY_QUERY, audienceCounts, categoryCounts, filterPrompts, type PromptQuery } from './promptFilter';
import { useCopy } from './useRail';

const AUDIENCES: Audience[] = ['both', 'professionals', 'students'];

/** A filter chip. Same shape whether it is filtering a category or an audience. */
const Chip = ({
  on,
  count,
  onClick,
  children,
}: {
  on: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    disabled={count === 0 && !on}
    className="pf-prompt-chip"
    style={{
      background: on ? c.ink : 'transparent',
      color: on ? c.accent : c.ink,
      border: `${rule.hair}px solid ${c.ink}`,
      ...label(10, 700, 0.12),
    }}
  >
    {children} <span style={{ color: on ? c.mark : c.dim }}>{count}</span>
  </button>
);

const PromptCard = ({
  prompt,
  copied,
  onCopy,
}: {
  prompt: Prompt;
  copied: boolean;
  onCopy: () => void;
}) => (
  <li className="pf-prompt-card">
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: s[3], marginBottom: s[3] }}>
      <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper }}>{prompt.id}</span>
      <h3 style={{ margin: 0, flex: 1, minWidth: 200, font: `700 17px/1.3 ${display}`, color: c.ink }}>
        {prompt.title}
      </h3>
      <span
        style={{
          padding: px(s[1], s[3]),
          border: `${rule.hair}px solid rgba(10,10,10,.45)`,
          ...label(9, 700, 0.12),
          color: c.dim,
          whiteSpace: 'nowrap',
        }}
      >
        {AUDIENCE_LABEL[prompt.audience]}
      </span>
    </div>

    <p
      style={{
        margin: px(0, 0, s[4]),
        padding: px(s[4], s[5]),
        background: c.accent,
        borderLeft: `${rule.base}px solid ${c.markOnPaper}`,
        font: `500 14px/1.6 ${mono}`,
        color: c.ink,
      }}
    >
      {prompt.prompt}
    </p>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], alignItems: 'baseline' }}>
      <p style={{ margin: 0, flex: 1, minWidth: 240, font: `400 15px/1.55 ${display}`, color: '#3a3a3a' }}>
        <span style={{ ...label(9, 700, 0.14), color: c.markOnPaper, marginRight: s[2] }}>WHY IT WORKS</span>
        {prompt.why}
      </p>
      <button type="button" onClick={onCopy} className="pf-copy" style={{ ...label(10, 700, 0.12) }}>
        {copied ? 'COPIED' : 'COPY'}
      </button>
    </div>
  </li>
);

/**
 * A hundred prompts you can actually find one of.
 *
 * This page is the largest on the site and was, until now, its worst: 100
 * records in a fixed order with no way to narrow them, which meant the only
 * retrieval strategy was ctrl-F or scrolling. The rail did not help — turning
 * every prompt into an `###` gave it 107 entries, a second wall beside the
 * first.
 *
 * All hundred render on the server. Filtering is client state on top, the same
 * arrangement the index feed uses, so the artifact is still wholly on the page
 * for anyone arriving from search — which is the promise `DropLayout` makes and
 * this page has more riding on than any other.
 *
 * Category and audience counts are computed against the rest of the query
 * rather than the whole set, so no chip ever offers a number that turns into an
 * empty result when you press it.
 */
const PromptLibrary = () => {
  const [query, setQuery] = useState<PromptQuery>(EMPTY_QUERY);
  const { copy, copiedKey } = useCopy();

  const shown = useMemo(() => filterPrompts(PROMPTS, query), [query]);
  const catCounts = useMemo(() => categoryCounts(PROMPTS, query), [query]);
  const audCounts = useMemo(() => audienceCounts(PROMPTS, query), [query]);

  const grouped = CATEGORIES.map((category) => ({
    category,
    items: shown.filter((p) => p.categoryId === category.id),
  })).filter((group) => group.items.length > 0);

  const filtered = shown.length !== PROMPTS.length;

  return (
    <section className="pf-bleed" style={{ margin: px(s[9], 0, s[10]) }}>
      <div style={{ border: `${rule.base}px solid ${c.ink}`, padding: s[6], marginBottom: s[8] }}>
        <label htmlFor="prompt-search" style={{ ...label(10, 700, 0.14), color: c.markOnPaper }}>
          SEARCH THE LIBRARY
        </label>
        <input
          id="prompt-search"
          type="search"
          value={query.q}
          onChange={(e) => setQuery((q) => ({ ...q, q: e.target.value }))}
          placeholder="devil's advocate, refactor, storyboard…"
          className="pf-prompt-search"
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], marginTop: s[5] }}>
          <Chip on={query.categoryId === null} count={catCounts.all} onClick={() => setQuery((q) => ({ ...q, categoryId: null }))}>
            ALL
          </Chip>
          {CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              on={query.categoryId === category.id}
              count={catCounts[category.id] ?? 0}
              onClick={() =>
                setQuery((q) => ({ ...q, categoryId: q.categoryId === category.id ? null : category.id }))
              }
            >
              {category.name}
            </Chip>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], marginTop: s[3] }}>
          <Chip on={query.audience === null} count={audCounts.all} onClick={() => setQuery((q) => ({ ...q, audience: null }))}>
            ANYONE
          </Chip>
          {AUDIENCES.map((audience) => (
            <Chip
              key={audience}
              on={query.audience === audience}
              count={audCounts[audience]}
              onClick={() => setQuery((q) => ({ ...q, audience: q.audience === audience ? null : audience }))}
            >
              {AUDIENCE_LABEL[audience]}
            </Chip>
          ))}
        </div>

        <p
          aria-live="polite"
          style={{ margin: px(s[5], 0, 0), font: `500 12px/1.5 ${mono}`, letterSpacing: '0.04em', color: c.dim }}
        >
          {shown.length} of {PROMPTS.length} prompts
          {filtered && (
            <button
              type="button"
              onClick={() => setQuery(EMPTY_QUERY)}
              className="pf-prompt-reset"
              style={{ ...label(10, 700, 0.12) }}
            >
              CLEAR
            </button>
          )}
        </p>
      </div>

      {grouped.length === 0 ? (
        <p style={{ margin: px(s[10], 0), font: `400 17px/1.6 ${display}`, color: c.dim }}>
          Nothing matches that. The prompts are worded plainly — try a word you would expect to see in one,
          like <em>refactor</em>, <em>outline</em> or <em>lighting</em>.
        </p>
      ) : (
        grouped.map(({ category, items }) => (
          <div key={category.id} style={{ marginBottom: s[10] }}>
            <h2
              id={category.anchor}
              style={{
                margin: px(0, 0, s[3]),
                font: `700 22px/1.2 ${display}`,
                letterSpacing: '-0.02em',
                color: c.ink,
                paddingBottom: s[3],
                borderBottom: `${rule.edge}px solid ${c.ink}`,
              }}
            >
              {category.id}. {category.name}{' '}
              <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper }}>{items.length}</span>
            </h2>

            {/* Only when the whole category is on screen. Under a filter it is
                framing for prompts that are no longer all there. */}
            {!filtered && (
              <p style={{ margin: px(0, 0, s[6]), font: `400 16px/1.6 ${display}`, color: '#3a3a3a' }}>
                {category.intro}
              </p>
            )}

            <ol className="pf-prompt-list">
              {items.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  copied={copiedKey === prompt.id}
                  onCopy={() => copy(prompt.prompt, prompt.id)}
                />
              ))}
            </ol>
          </div>
        ))
      )}
    </section>
  );
};

export default PromptLibrary;
