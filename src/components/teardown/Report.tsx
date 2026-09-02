import { useEffect, useRef } from 'react';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import type { ReportModel, SectionReport } from '@/lib/teardown/report';

/**
 * The nine sections, revealed the moment the email is submitted — it does not
 * wait on the network. A failed send therefore degrades to "no email arrived",
 * never to "no report", which is why `sendFailed` is a quiet line at the
 * bottom rather than an error state around the whole thing.
 *
 * Every string rendered here comes out of `ReportModel`, and every finding in
 * that model was copied verbatim from the question bank. Nothing on this
 * screen tells the reader what to do.
 */

const STATE_LABEL: Record<SectionReport['state'], string> = {
  decided: 'DECIDED',
  undecided: 'NOT DECIDED YET',
  mixed: 'PARTLY DECIDED',
};

const Section = ({ section }: { section: SectionReport }) => (
  <article style={{ borderTop: `${rule.base}px solid ${c.rule}`, padding: px(s[7], 0) }}>
    <div style={{ display: 'flex', gap: s[4], flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={{ font: `700 11px/1 ${mono}`, color: c.mark }}>
        {String(section.id).padStart(2, '0')}
      </span>
      <h3 style={{ margin: 0, ...heading('d6'), color: '#fff' }}>{section.title}</h3>
      <span style={{ ...label(10, 700, 0.14), color: c.dimOnInk, marginLeft: 'auto' }}>
        {STATE_LABEL[section.state]} · {section.score}/100
      </span>
    </div>
    <div style={{ display: 'grid', gap: s[3], marginTop: s[5], maxWidth: '62ch' }}>
      {section.findings.map((f, i) => (
        <p key={`${section.id}-${i}`} style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>
          {f}
        </p>
      ))}
    </div>
  </article>
);

export default function Report({ model, sendFailed }: { model: ReportModel; sendFailed: boolean }) {
  // `Report` only ever mounts on the Gate -> Report phase transition — never
  // in the prerendered page — so focusing on mount here is always a
  // deliberate transition, never a yank on first arrival.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>THE BREAKDOWN</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        style={{ margin: px(s[5], 0, s[8]), ...heading('d4'), textTransform: 'uppercase', color: '#fff' }}
      >
        Nine sections, as you answered them
      </h2>

      {model.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      <div style={{ borderTop: `${rule.base}px solid ${c.rule}`, paddingTop: s[7] }}>
        <p style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '62ch' }}>
          That is what the answers show. What to change first, in what order, and what it costs to get
          wrong is the recorded teardown.
        </p>
        <a
          href="/work-with-me"
          className="pf-nudge pf-nudge-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: s[3],
            marginTop: s[6],
            padding: px(s[4], s[5]),
            background: c.accent,
            color: c.ink,
            ...label(11, 700, 0.12),
            textDecoration: 'none',
          }}
        >
          SEE THE TEARDOWN<span>↗</span>
        </a>

        {sendFailed && (
          <p style={{ margin: px(s[6], 0, 0), font: `400 13px/1.4 ${display}`, color: c.dimOnInk }}>
            Couldn&rsquo;t email a copy just now — it&rsquo;s all here on the page.
          </p>
        )}
      </div>
    </div>
  );
}
