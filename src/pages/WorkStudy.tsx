import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { buttonType, c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import NotesShell, { Column } from '@/components/notes/NotesShell';
import { prose } from '@/components/notes/prose';
import { Seo, ORIGIN } from '@/components/Seo';
import { kindLabel, studyPath, visibleStudies, type Study } from '@/data/caseStudies';
import NotFound from './NotFound';

const H2 = prose.h2;
const P = prose.p;

/** Internal paths route client-side; everything else opens in a new tab. */
const Go = ({ href, children, style }: { href: string; children: ReactNode; style?: React.CSSProperties }) =>
  href.startsWith('/') ? (
    <Link to={href} style={style}>
      {children}
    </Link>
  ) : (
    <a href={href} style={style} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  );

/** The context strip: the facts a skimmer wants before the story. */
const Strip = ({ study }: { study: Study }) => {
  const rows: [string, ReactNode][] = [
    ['TYPE', kindLabel[study.kind]],
    ...(study.client ? ([['CLIENT', study.client]] as [string, ReactNode][]) : []),
    ...(study.deliveredAt ? ([['DELIVERED AT', study.deliveredAt]] as [string, ReactNode][]) : []),
    ['ROLE', study.role],
    ['TIMELINE', study.timeline],
    ['PLATFORM', study.platformLabel],
    ['STACK', study.stack.join(' · ')],
    ...(study.link
      ? ([
          [
            'LINK',
            <Go href={study.link.href} style={{ color: c.ink, textDecorationColor: c.markOnPaper, textUnderlineOffset: 3 }}>
              {study.link.label}
              {study.link.href.startsWith('http') ? ' ↗' : ' →'}
            </Go>,
          ],
        ] as [string, ReactNode][])
      : []),
  ];
  return (
    <dl
      style={{
        margin: px(s[8], 0, 0),
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
        borderTop: `${rule.edge}px solid ${c.ink}`,
        borderBottom: `${rule.hair}px solid ${c.ink}`,
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ padding: px(s[4], s[4], s[4], 0) }}>
          <dt style={{ ...label(10, 700, 0.14), color: c.markOnPaper, marginBottom: s[2] }}>{k}</dt>
          <dd style={{ margin: 0, font: `500 13px/1.5 ${mono}`, color: c.ink }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
};

/** Dev-only: what this study is waiting on before it can go live. */
const PendingNote = ({ items }: { items: string[] }) => (
  <aside
    style={{
      margin: px(s[6], 0, 0),
      padding: px(s[5], s[6]),
      background: '#fff6e0',
      border: `${rule.base}px dashed ${c.markOnPaper}`,
    }}
  >
    <p style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[3]) }}>
      PENDING · NOT PUBLISHED · WAITING ON
    </p>
    <ul style={{ margin: 0, paddingLeft: s[5], font: `400 15px/1.55 ${display}`, color: c.ink }}>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  </aside>
);

const Paras = ({ items }: { items: string[] }) => (
  <>
    {items.map((t) => (
      <P key={t}>{t}</P>
    ))}
  </>
);

const StudyPage = ({ study }: { study: Study }) => {
  const path = studyPath(study);
  const personal = study.kind === 'personal';
  return (
    <NotesShell>
      <Seo
        title={study.seoTitle}
        description={study.description}
        path={path}
        type="article"
        robots={study.status === 'pending' ? 'noindex, nofollow' : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: study.title,
          description: study.description,
          url: `${ORIGIN}${path}`,
          author: { '@type': 'Person', name: 'Anadi Thakur', url: ORIGIN },
        }}
      />
      <Column>
        <Link to="/work" style={{ ...label(10, 700, 0.14), color: c.dim, textDecoration: 'none' }}>
          ← ALL CASE STUDIES
        </Link>
        <p style={{ ...label(11, 700, 0.14), color: c.markOnPaper, margin: px(s[7], 0, s[4]) }}>{study.name.toUpperCase()}</p>
        <h1 style={{ margin: 0, ...heading('d4', { vw: true }), color: c.ink }}>{study.title}</h1>

        {study.status === 'pending' && study.pending && <PendingNote items={study.pending} />}

        <Strip study={study} />

        <H2>{personal ? 'The problem' : 'The client’s problem'}</H2>
        <Paras items={study.problem} />

        {study.learned && (
          <>
            <H2>What I had to learn</H2>
            <ul style={{ font: `400 17px/1.65 ${display}`, color: '#1c1c1c', margin: px(0, 0, s[5]), paddingLeft: s[6] }}>
              {study.learned.map((t) => (
                <li key={t} style={{ marginBottom: s[3] }}>
                  {t}
                </li>
              ))}
            </ul>
          </>
        )}

        <H2>What I built</H2>
        <Paras items={study.built} />

        <ol style={{ listStyle: 'none', margin: px(s[7], 0, 0), padding: 0, borderTop: `${rule.base}px solid ${c.ink}` }}>
          {study.decisions.map((d, i) => (
            <li
              key={d.head}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                gap: s[4],
                padding: px(s[6], 0),
                borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)`,
              }}
            >
              <span style={{ ...label(12, 700, 0.1), color: c.markOnPaper }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 style={{ margin: px(0, 0, s[3]), font: `700 19px/1.3 ${display}`, color: c.ink }}>{d.head}</h3>
                <p style={{ margin: 0, font: `400 16px/1.6 ${display}`, color: '#2a2a2a' }}>{d.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {study.proof && (
          <figure style={{ margin: px(s[9], 0, 0) }}>
            <img
              src={study.proof.src}
              alt={study.proof.alt}
              loading="lazy"
              decoding="async"
              style={{ display: 'block', width: '100%', height: 'auto', border: `${rule.base}px solid ${c.ink}` }}
            />
            <figcaption style={{ marginTop: s[3], ...label(10, 500, 0.12), color: c.dim }}>{study.proof.note.toUpperCase()}</figcaption>
          </figure>
        )}

        {study.proofTable && (
          <figure style={{ margin: px(s[9], 0, 0) }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: `400 14px/1.45 ${display}`, color: c.ink }}>
                <thead>
                  <tr>
                    {study.proofTable.head.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        style={{ textAlign: 'left', padding: px(s[3], s[3], s[3], 0), borderBottom: `${rule.base}px solid ${c.ink}`, ...label(10, 700, 0.12) }}
                      >
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {study.proofTable.rows.map((r) => (
                    <tr key={r[0]}>
                      {r.map((cell, i) => (
                        <td key={i} style={{ padding: px(s[3], s[3], s[3], 0), borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)`, verticalAlign: 'top' }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption style={{ marginTop: s[3], ...label(10, 500, 0.12), color: c.dim }}>{study.proofTable.caption.toUpperCase()}</figcaption>
          </figure>
        )}

        <H2>{personal ? 'Where it stands' : 'Results'}</H2>
        <Paras items={study.results} />

        {study.lessons && study.lessons.length > 0 && (
          <>
            <H2>What it taught me</H2>
            <Paras items={study.lessons} />
          </>
        )}

        <div
          style={{
            margin: px(s[10], 0, 0),
            padding: px(s[7], s[6]),
            background: c.ink,
            color: '#fff',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: s[5],
          }}
        >
          <p style={{ margin: 0, font: `500 19px/1.4 ${display}`, maxWidth: 420 }}>{study.cta.lead}</p>
          <Go
            href={study.cta.href}
            style={{ ...buttonType(16), padding: px(s[3], s[5]), background: c.accent, color: c.ink, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {study.cta.label} →
          </Go>
        </div>
      </Column>
    </NotesShell>
  );
};

/** One lazily-loaded element behind every `/work/:slug`, resolved from the path like the notes routes. */
export const Component = () => {
  const slug = useLocation().pathname.split('/')[2];
  const study = visibleStudies.find((s) => s.slug === slug);
  if (!study) return <NotFound />;
  return <StudyPage study={study} />;
};

export default Component;
