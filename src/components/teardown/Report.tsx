import { Fragment, useEffect, useMemo, useRef } from 'react';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import {
  CLOSING,
  DOC_KIND,
  DOC_TITLE,
  END_MARK,
  STATE_LABEL,
  clause,
  docRef,
  issuedOn,
  metaRows,
} from '@/lib/teardown/document';
import type { ReportModel, SectionReport } from '@/lib/teardown/report';

/**
 * The nine sections, revealed the moment the email is submitted; it does not
 * wait on the network. A failed send therefore degrades to "no email arrived",
 * never to "no report", which is why `sendFailed` is a quiet line at the
 * bottom rather than an error state around the whole thing.
 *
 * It is set as a technical report — a sheet of paper laid on the dark page,
 * with a masthead, a reference, a metadata block, a section index and numbered
 * clauses — because that is what it is: a document about a system, issued
 * against a fixed instrument, and the same document that lands in the inbox.
 * `document.ts` derives the masthead so the two cannot drift apart.
 *
 * There is deliberately no download here. The file lives in the email, which
 * is the one thing the reader gave us an address for.
 *
 * Every finding rendered here was copied verbatim from the question bank.
 * Nothing on this screen tells the reader what to do.
 */

/** The document sheet: ink on white, laid on the cream of the section. */
const paper = {
  bg: c.paper,
  edge: c.accentEdge,
  ink: c.ink,
  body: '#1a1a1a',
  dim: c.dim,
  gold: c.markOnPaper,
} as const;

const labelStyle = (size = 10) => ({ ...label(size, 700, 0.16), color: paper.dim });
const num = (size = 12) => ({ font: `700 ${size}px/1.4 ${mono}`, color: paper.gold });

const Section = ({ section }: { section: SectionReport }) => (
  <article style={{ borderTop: `${rule.base}px solid ${paper.ink}`, padding: px(s[6], 0, s[4]) }}>
    <div style={{ display: 'flex', gap: s[4], flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={num(12)}>{clause(section.id)}</span>
      <h3 style={{ margin: 0, ...heading('d6'), textTransform: 'uppercase', color: paper.ink }}>
        {section.title}
      </h3>
      <span
        style={{
          marginLeft: 'auto',
          font: `400 10px/1.4 ${mono}`,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: paper.dim,
          whiteSpace: 'nowrap',
        }}
      >
        {STATE_LABEL[section.state]} ·{' '}
        <b style={{ color: paper.ink }}>
          {section.score}/100
        </b>
      </span>
    </div>

    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: '46px minmax(0, 1fr)',
        gap: `${s[2]}px 0`,
        margin: px(s[5], 0, 0),
        maxWidth: '78ch',
      }}
    >
      {section.findings.map((f, i) => (
        <Fragment key={`${section.id}-${i}`}>
          <dt style={{ font: `400 10px/1.9 ${mono}`, color: paper.gold }}>{clause(section.id, i)}</dt>
          <dd style={{ margin: 0, font: `400 15px/1.6 ${display}`, color: paper.body, textWrap: 'pretty' }}>
            {f}
          </dd>
        </Fragment>
      ))}
    </dl>
  </article>
);

export default function Report({ model, sendFailed }: { model: ReportModel; sendFailed: boolean }) {
  // `Report` only ever mounts on the Gate -> Report phase transition, never
  // in the prerendered page, so focusing on mount here is always a
  // deliberate transition, never a yank on first arrival. The same is why
  // reading the clock here is safe: there is no prerendered markup for it to
  // disagree with.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const issued = useMemo(() => issuedOn(new Date()), []);
  const ref = docRef(model);
  const meta = metaRows(model, issued);

  return (
    <div
      style={{
        background: paper.bg,
        border: `${rule.hair}px solid ${paper.edge}`,
        color: paper.body,
        padding: px(s[9], s[8], s[8]),
        containerType: 'inline-size',
      }}
    >
      {/* masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: s[4], flexWrap: 'wrap' }}>
        <span style={{ ...label(10, 700, 0.16), color: paper.gold }}>TECHNICAL REPORT</span>
        <span style={{ font: `700 10px/1.4 ${mono}`, letterSpacing: '0.14em', color: paper.dim }}>{ref}</span>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        style={{ margin: px(s[5], 0, 0), ...heading('d4'), textTransform: 'uppercase', color: paper.ink }}
      >
        {DOC_TITLE} 📝
      </h2>
      <p style={{ margin: px(s[3], 0, 0), ...labelStyle(10) }}>{DOC_KIND}</p>

      {/* metadata block */}
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: '150px minmax(0, 1fr)',
          gap: `${s[2]}px 0`,
          margin: px(s[7], 0, 0),
          paddingTop: s[5],
          borderTop: `${rule.base}px solid ${paper.ink}`,
        }}
      >
        {meta.map((row) => (
          <Fragment key={row.label}>
            <dt
              style={{
                font: `700 10px/1.8 ${mono}`,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: paper.dim,
              }}
            >
              {row.label}
            </dt>
            <dd style={{ margin: 0, font: `700 13px/1.8 ${mono}`, color: paper.ink, overflowWrap: 'anywhere' }}>
              {row.value}
            </dd>
          </Fragment>
        ))}
      </dl>

      {/* section index */}
      <p style={{ margin: px(s[9], 0, s[4]), ...labelStyle(10) }}>SECTION INDEX</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: `${rule.base}px solid ${paper.ink}` }}>
        <tbody>
          {model.sections.map((section) => (
            <tr key={section.id}>
              <td style={{ width: 46, padding: px(s[3], 0), borderBottom: `1px solid ${paper.edge}`, ...num(12) }}>
                {clause(section.id)}
              </td>
              <td
                style={{
                  padding: px(s[3], 0),
                  borderBottom: `1px solid ${paper.edge}`,
                  font: `700 14px/1.4 ${display}`,
                  color: paper.ink,
                }}
              >
                {section.title}
              </td>
              <td
                style={{
                  padding: px(s[3], 0),
                  borderBottom: `1px solid ${paper.edge}`,
                  textAlign: 'right',
                  font: `400 10px/1.4 ${mono}`,
                  letterSpacing: '0.1em',
                  color: paper.dim,
                  whiteSpace: 'nowrap',
                }}
              >
                {STATE_LABEL[section.state]}
              </td>
              <td
                style={{
                  width: 60,
                  padding: px(s[3], 0),
                  borderBottom: `1px solid ${paper.edge}`,
                  textAlign: 'right',
                  font: `700 12px/1.4 ${mono}`,
                  color: paper.ink,
                }}
              >
                {section.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* findings */}
      <p style={{ margin: px(s[9], 0, s[4]), ...labelStyle(10) }}>FINDINGS</p>
      {model.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      {/* closing */}
      <div style={{ borderTop: `${rule.base}px solid ${paper.ink}`, paddingTop: s[6] }}>
        <p style={{ margin: 0, font: `400 15px/1.6 ${display}`, color: paper.body, maxWidth: '66ch' }}>
          {CLOSING}
        </p>
        <a
          href="/rescue/audit"
          className="pf-nudge pf-nudge-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: s[3],
            marginTop: s[6],
            padding: px(s[4], s[5]),
            background: paper.ink,
            color: c.accent,
            ...label(11, 700, 0.12),
            textDecoration: 'none',
          }}
        >
          GET A FREE AUDIT<span>→</span>
        </a>

        <p style={{ margin: px(s[7], 0, 0), font: `400 13px/1.6 ${display}`, color: paper.dim, maxWidth: '66ch' }}>
          {sendFailed ? (
            <>
              Couldn&rsquo;t email a copy just now, so there is no file to download; it&rsquo;s all here on
              the page.
            </>
          ) : (
            <>
              A copy of this document is <strong style={{ color: paper.ink }}>attached to the email</strong> on
              its way to you, as <span style={{ font: `400 12px/1.6 ${mono}` }}>.html</span> you can open in
              any browser and print to PDF. The download is only there; this page doesn&rsquo;t keep one.
            </>
          )}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: s[4],
            flexWrap: 'wrap',
            marginTop: s[8],
            paddingTop: s[4],
            borderTop: `1px solid ${paper.edge}`,
            font: `700 10px/1.4 ${mono}`,
            letterSpacing: '0.14em',
            color: paper.dim,
          }}
        >
          <span>{END_MARK}</span>
          <span>
            {ref} · {issued}
          </span>
        </div>
      </div>
    </div>
  );
}
