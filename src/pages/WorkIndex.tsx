import { useState } from 'react';
import { Link } from 'vite-react-ssg';
import { c, display, heading, label, px, rule, s, stretch } from '@/components/portfolio/tokens';
import NotesShell, { Column } from '@/components/notes/NotesShell';
import { Seo, ORIGIN } from '@/components/Seo';
import { kindLabel, studyPath, visibleStudies, type Study } from '@/data/caseStudies';

type Filter = 'all' | 'client' | 'personal' | 'mobile';

const TITLE = 'Case studies · Anadi Thakur';
const DESCRIPTION =
  'Client projects and personal builds by Anadi Thakur, full-stack engineer: web, mobile and AI, each with the problem, the decisions and what came of it.';

const FILTERS: { key: Filter; label: string; test: (s: Study) => boolean }[] = [
  { key: 'all', label: 'ALL', test: () => true },
  { key: 'client', label: 'CLIENT', test: (s) => s.kind === 'client' },
  { key: 'personal', label: 'PERSONAL', test: (s) => s.kind === 'personal' },
  { key: 'mobile', label: 'MOBILE', test: (s) => s.platform === 'Mobile' },
];

const Tag = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => (
  <span
    style={{
      padding: px(s[1], s[3]),
      border: `${rule.hair}px solid var(--wc-edge)`,
      ...label(10, 700, 0.12),
      color: strong ? 'var(--wc-mark)' : 'var(--wc-ink)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

const Card = ({ study }: { study: Study }) => (
  <li style={{ display: 'flex' }}>
    <Link
      to={studyPath(study)}
      className="pf-work-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: s[4],
        width: '100%',
        padding: px(s[6], s[6]),
        border: `${rule.base}px solid ${c.ink}`,
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[2] }}>
        <Tag strong>{kindLabel[study.kind]}</Tag>
        <Tag>{study.platform.toUpperCase()}</Tag>
        {study.status === 'pending' && <Tag>PENDING · DEV ONLY</Tag>}
      </div>
      <h2 style={{ margin: 0, ...heading('d6', { vw: true }), color: 'var(--wc-ink)' }}>{study.name}</h2>
      {study.client && (
        <p style={{ margin: 0, ...label(10, 500, 0.12), color: 'var(--wc-dim)' }}>CLIENT · {study.client.toUpperCase()}</p>
      )}
      <p style={{ margin: 0, font: `400 16px/1.5 ${display}`, color: 'var(--wc-body)', flex: 1 }}>{study.result}</p>
      <span style={{ ...label(10, 700, 0.14), color: 'var(--wc-mark)' }}>READ THE CASE STUDY →</span>
    </Link>
  </li>
);

/**
 * `/work`: every case study, filterable.
 *
 * Same pattern as the notes feed: the filter is client state over a list that
 * is fully prerendered, so every card is in the static HTML whichever chip is
 * pressed. Pending studies only exist here under `npm run dev`; see
 * `data/caseStudies.ts`.
 */
const WorkIndex = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const test = FILTERS.find((f) => f.key === filter)!.test;
  const shown = visibleStudies.filter(test);

  return (
    <NotesShell>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/work"
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: TITLE,
          description: DESCRIPTION,
          url: `${ORIGIN}/work`,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
        }}
      />
      <Column wide>
        <h1
          style={{
            margin: 0,
            ...heading('d2', { stretch: stretch.bleed, vw: true }),
            color: c.ink,
            textTransform: 'uppercase',
          }}
        >
          Case studies
        </h1>
        <p style={{ margin: px(s[6], 0, s[8]), maxWidth: 640, font: `400 19px/1.55 ${display}`, color: '#3a3a3a' }}>
          Client projects I delivered, and things I built to solve a problem I kept seeing. Each one says what was wrong, what I decided and why,
          and what came of it. Numbers only where they were measured.
        </p>

        <div role="group" aria-label="Filter case studies" style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], marginBottom: s[7] }}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            const count = visibleStudies.filter(f.test).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={on}
                style={{
                  display: 'flex',
                  gap: s[3],
                  padding: px(s[2], s[4]),
                  background: on ? c.ink : 'transparent',
                  color: on ? c.accent : c.ink,
                  border: `${rule.hair}px solid ${c.ink}`,
                  ...label(10, 700, 0.12),
                  cursor: 'pointer',
                }}
              >
                {f.label} <span style={{ color: on ? c.mark : c.dim }}>{count}</span>
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <p style={{ margin: px(s[8], 0), font: `400 17px/1.6 ${display}`, color: c.dim }}>
            Nothing here yet. The other filters have the rest.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: s[5],
            }}
          >
            {shown.map((study) => (
              <Card key={study.slug} study={study} />
            ))}
          </ul>
        )}
      </Column>
    </NotesShell>
  );
};

export default WorkIndex;
