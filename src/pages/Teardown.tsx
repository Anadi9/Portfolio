import { useMemo, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { PORTFOLIO_ORIGIN, Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import Gate from '@/components/teardown/Gate';
import Quiz from '@/components/teardown/Quiz';
import Report from '@/components/teardown/Report';
import Share from '@/components/teardown/Share';
import Verdict from '@/components/teardown/Verdict';
import { QUESTIONS } from '@/lib/teardown/questions';
import { report } from '@/lib/teardown/report';

/**
 * `/teardown`: the free Wrapper Test.
 *
 * This page is meant to be found: it carries full
 * `Seo`, and the intro plus the first question render into the prerendered
 * HTML rather than sitting behind a Start click, so a crawler arriving here
 * gets the actual proposition instead of a button.
 *
 * The whole quiz is one `answers` array in state. Nothing leaves the browser
 * until an email is submitted; abandoning halfway sends us nothing, by design.
 *
 * Submitting reveals the report immediately and fires the POST without
 * awaiting it. That ordering is the point: a failed send costs the reader a
 * copy in their inbox, never the report itself.
 */

const TITLE = 'The Wrapper Test: is your AI product real, or a wrapper?';
const DESCRIPTION =
  'A free 13-question test for AI products: score defensibility, failure design, cost floor and evals, and get a written breakdown. No call, no signup.';

/** A free tool, so `WebApplication` at price 0, credited to the homepage's Person. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'The Wrapper Test',
  description: DESCRIPTION,
  url: 'https://anadithakur.in/teardown',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (runs in the browser)',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  creator: { '@id': `${PORTFOLIO_ORIGIN}/#person` },
};

const section = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${c.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
} as const;

const TOTAL = QUESTIONS.length;

export default function Teardown() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [unlocked, setUnlocked] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const complete = answers.every((a) => a !== null);
  const model = useMemo(() => (complete ? report(answers as number[]) : null), [complete, answers]);

  /** `optionIndex === -1` is the Back contract: clear this answer. */
  const onAnswer = (questionIndex: number, optionIndex: number) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex === -1 ? null : optionIndex;
      return next;
    });

  const onSubmit = (email: string, honeypot: string) => {
    setUnlocked(true);
    fetch('/api/teardown-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, email, hp: honeypot }),
    })
      .then((r) => {
        if (!r.ok) setSendFailed(true);
      })
      .catch(() => setSendFailed(true));
  };

  return (
    <div style={{ background: c.ink, color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/teardown" type="website" jsonLd={jsonLd} />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: s[4],
          padding: px(s[4], gutter),
          borderBottom: `${rule.edge}px solid ${c.rule}`,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
          <span
            aria-hidden
            style={{ width: 22, height: 22, background: c.accent, border: `${rule.hair}px solid ${c.accentEdge}`, display: 'block' }}
          />
          <span style={{ ...label(11, 700, 0.12), color: '#fff' }}>ANADI THAKUR</span>
        </Link>
        <nav aria-label="Site" style={{ display: 'flex', alignItems: 'center', gap: s[6] }}>
          <Link to="/notes" className="pf-underline" style={{ ...label(11, 700, 0.14), color: '#fff' }}>
            NOTES
          </Link>
          <Link to="/rescue/audit" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.dimOnInk }}>
            FREE AUDIT
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ ...section, borderTop: 'none' }}>
          <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>FREE · {TOTAL} QUESTIONS · 3 MINUTES</p>
          <h1 style={{ margin: px(s[5], 0, 0), ...heading('d2'), textTransform: 'uppercase', maxWidth: '15ch' }}>
            The <span style={{ color: c.mark }}>wrapper</span> test 🧪
          </h1>
          <p
            style={{
              margin: px(s[6], 0, 0),
              font: `400 17px/1.5 ${display}`,
              color: c.dimOnInk,
              maxWidth: '58ch',
              textWrap: 'pretty',
            }}
          >
            Answer thirteen questions about your own AI feature and see where it is thin: defensibility,
            failure design, cost floor, evaluation. It scores your answers, not a guess about your product,
            so nothing here is invented. Your result appears straight away; nothing is asked for to see it.
          </p>
          <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '58ch' }}>
            This tells you <em>where</em> the problems are. To have an engineer look at the app itself and
            rank what to fix first, the <Link to="/rescue/audit" className="pf-underline" style={{ color: c.accent }}>production
            audit</Link> is free.
          </p>
        </section>

        <section aria-label={complete ? 'Your result' : 'The test'} style={section}>
          {!complete && <Quiz answers={answers} onAnswer={onAnswer} />}
          {complete && model && <Verdict result={model.result} />}
        </section>

        {/* Above the gate on purpose: a link to the result should not depend on
            having handed over an address. */}
        {complete && (
          <section aria-label="Share your result" style={section}>
            <Share answers={answers as number[]} />
          </section>
        )}

        {complete && model && !unlocked && (
          <section aria-label="The written breakdown" style={section}>
            <Gate onSubmit={onSubmit} />
          </section>
        )}

        {complete && model && unlocked && (
          <section aria-label="The breakdown" style={{ ...section, background: c.accent, color: c.ink }}>
            <Report model={model} sendFailed={sendFailed} />
          </section>
        )}
      </main>
    </div>
  );
}
