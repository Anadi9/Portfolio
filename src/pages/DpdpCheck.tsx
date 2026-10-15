import { useState } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { TerminalHead } from '@/components/brand/BitHead';
import { scoreFace } from '@/components/brand/BitUI';
import { c, display, heading, label, px, rule, s, stretch } from '@/components/brand/tokens';
import { FaqSection, PaperPage, SiteHeader, TrustLine, body, cta, ctaClick, lead, p, section, split } from '@/components/site/kit';
import { ANSWERS, ANSWER_LABEL, QUESTIONS, type Answer } from '@/lib/dpdp/questions';
import { scoreAnswers } from '@/lib/dpdp/score';
import { breadcrumbs, faqPage, graph, type Faq } from '@/lib/schema';

/**
 * `/dpdp/check`: the free DPDP self-check. Thirteen questions about what the
 * product does, a readiness score and the gaps ranked by weight, ending at
 * the DPDP audit.
 *
 * Runs entirely in the browser: no API, no email, nothing sent anywhere. For
 * a privacy tool that is the point, and the page says so. Every question and
 * its legal basis is prerendered, so the page also answers "what does DPDP
 * require of my app?" for a crawler.
 */

const PAGE = 'dpdp_check';
const PATH = '/dpdp/check';
const TITLE = 'DPDP Act Self-Check for Apps: 13 Questions, Free';
const DESCRIPTION =
  'Is your app ready for India’s DPDP Act? Answer 13 questions about consent, deletion, security and breaches, and see your gaps. Free, nothing stored.';

const faqs: Faq[] = [
  {
    q: 'What does the DPDP Act require an app to do?',
    a: 'In product terms: show a clear notice and take specific consent per purpose, let people withdraw consent, access, correct and delete their data, erase data when it is no longer needed, protect it with reasonable security safeguards, report breaches to users and the Data Protection Board, and treat under-18 users’ data with verifiable parental consent and no tracking.',
  },
  {
    q: 'Is this self-check legal advice?',
    a: 'No. It is a quick way to see which obligations your product may not meet yet. A lawyer decides what your policy says; the free DPDP audit shows what your product needs to change.',
  },
  {
    q: 'Do you store my answers?',
    a: 'No. The check runs in your browser and nothing is sent anywhere.',
  },
];

const jsonLd = graph([
  {
    '@type': 'WebApplication',
    '@id': 'https://anadithakur.in/dpdp/check#app',
    name: 'DPDP self-check',
    description: DESCRIPTION,
    url: `https://anadithakur.in${PATH}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    provider: { '@id': 'https://anadithakur.in/#business' },
  },
  faqPage(faqs, `https://anadithakur.in${PATH}#faq`),
  breadcrumbs(
    [
      { name: 'Privacy & compliance', path: '/dpdp' },
      { name: 'Self-check', path: PATH },
    ],
    `https://anadithakur.in${PATH}#breadcrumb`,
  ),
]);

const DpdpCheck = () => {
  const [answers, setAnswers] = useState<Partial<Record<string, Answer>>>({});
  const result = scoreAnswers(answers);
  const done = result.answered === QUESTIONS.length;

  const pick = (id: string, a: Answer) => {
    setAnswers((prev) => ({ ...prev, [id]: a }));
  };

  let lastArea = '';

  return (
    <PaperPage header={<SiteHeader page={PAGE} current="dpdp" />}>
      <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />

      <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[9] }} data-rescue-hpad>
        <div style={{ display: 'grid', gap: s[6], maxWidth: 900 }}>
          <span style={{ ...label(11, 700, 0.14), color: p.gold }}>FREE · 13 QUESTIONS · 3 MINUTES</span>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
            Is your app ready for <span style={{ color: p.gold }}>India&apos;s data law?</span>
          </h1>
          <p style={{ ...lead, maxWidth: '58ch' }}>
            Thirteen questions about what your product actually does with personal data. Each one maps to an obligation
            in the DPDP Act or Rules, most of which apply from May 2027. You&apos;ll get a readiness score and your gaps,
            ranked.
          </p>
          <TrustLine items={['Runs in your browser', 'Nothing stored', 'No sign-up']} />
        </div>
      </section>

      <section aria-label="Questions" style={section} data-rescue-hpad>
        <div data-rescue-split style={{ ...split('8fr 4fr'), alignItems: 'start' }}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0, minWidth: 0 }}>
            {QUESTIONS.map((q, i) => {
              const head = q.area !== lastArea ? q.area : null;
              lastArea = q.area;
              return (
                <li key={q.id} style={{ display: 'grid', gap: s[4], padding: px(s[7], 0), borderTop: head ? `${rule.base}px solid ${c.ink}` : `${rule.hair}px solid ${p.rule}` }}>
                  {head && <span style={{ ...label(10, 700, 0.16), color: p.gold }}>{head.toUpperCase()}</span>}
                  <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
                    <legend style={{ padding: 0, font: `600 18px/1.35 ${display}`, color: p.ink }}>
                      <span style={{ color: p.dim, marginRight: s[2] }}>{String(i + 1).padStart(2, '0')}</span>
                      {q.q}
                    </legend>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[2] }}>
                      {ANSWERS.map((a) => {
                        const on = answers[q.id] === a;
                        return (
                          <label
                            key={a}
                            data-audit-chip
                            style={{
                              position: 'relative',
                              display: 'inline-flex',
                              alignItems: 'center',
                              minHeight: 44,
                              padding: px(0, s[5]),
                              border: `${rule.base}px solid ${c.ink}`,
                              background: on ? c.ink : '#fff',
                              color: on ? c.accent : p.ink,
                              font: `600 14px/1 ${display}`,
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={on}
                              onChange={() => pick(q.id, a)}
                              style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
                            />
                            {ANSWER_LABEL[a]}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <p style={{ ...body, fontSize: 14 }}>
                    <span style={{ ...label(10, 700, 0.12), color: p.dim, marginRight: s[2] }}>WHY IT MATTERS</span>
                    {q.basis}
                  </p>
                </li>
              );
            })}
          </ol>

          <aside aria-live="polite" style={{ position: 'sticky', top: s[6], display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: s[3] }}>
              <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>
                {done ? 'YOUR DPDP READINESS' : `${result.answered} OF ${QUESTIONS.length} ANSWERED`}
              </span>
              {/* Keyed by the count, so every answer replays the screen flicker: the head visibly takes each one in. */}
              <span data-th-mode="night" style={{ lineHeight: 0 }}>
                <TerminalHead
                  key={result.answered}
                  face={result.answered === 0 ? 'prompt' : done ? scoreFace(result.score) : 'think'}
                  shape="laptop"
                  size={60}
                  motion={done && result.score >= 80 ? 'hop' : 'idle'}
                  label=""
                />
              </span>
            </div>
            {result.answered === 0 ? (
              <p style={{ ...body, color: c.bright }}>Answer the questions and your score builds here.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: s[3] }}>
                  <span style={{ ...heading('d2', { stretch: stretch.bleed }), color: result.score >= 80 ? c.signalOnInk : c.mark }}>{result.score}</span>
                  <span style={{ ...label(12, 700, 0.12), color: c.dimOnInk }}>/ 100{done ? '' : ' SO FAR'}</span>
                </div>
                <div style={{ display: 'grid', gap: s[2] }}>
                  <span style={{ font: `600 17px/1.3 ${display}` }}>{result.band.label}</span>
                  <p style={{ ...body, color: c.bright }}>{result.band.line}</p>
                </div>
              </>
            )}
            <Link to="/audit?type=dpdp" onClick={ctaClick(PAGE, done ? 'result' : 'sidebar', 'dpdp')} className="pf-nudge" style={{ ...cta, background: c.accent, color: c.ink }}>
              Get the free DPDP audit<span aria-hidden>→</span>
            </Link>
            <p style={{ ...body, fontSize: 13, color: c.dimOnInk }}>Not legal advice. Your answers never leave this page.</p>
          </aside>
        </div>
      </section>

      {result.gaps.length > 0 && (
        <section aria-labelledby="h-gaps" style={section} data-rescue-hpad>
          <h2 id="h-gaps" style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>
            {done ? 'What to build first' : 'Your gaps so far'}
          </h2>
          <ol style={{ listStyle: 'none', margin: px(s[9], 0, 0), padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
            {result.gaps.map((g, i) => (
              <li key={g.id} data-rescue-split style={{ ...split('1fr 3fr'), gap: s[6], padding: px(s[6], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                <div style={{ display: 'grid', gap: s[1], alignContent: 'start' }}>
                  <span style={{ ...heading('d6'), color: p.gold }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ ...label(10, 700, 0.12), color: p.dim }}>
                    {g.area.toUpperCase()} · YOU SAID {ANSWER_LABEL[g.answer].toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: s[2] }}>
                  <span style={{ font: `600 17px/1.35 ${display}` }}>{g.fix}</span>
                  <span style={{ ...body, fontSize: 14 }}>{g.basis}</span>
                </div>
              </li>
            ))}
          </ol>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: s[6], marginTop: s[8] }}>
            <Link to="/audit?type=dpdp" onClick={ctaClick(PAGE, 'gaps', 'dpdp')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
              Have these built: first bug free<span aria-hidden>→</span>
            </Link>
            <Link to="/dpdp" className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink }}>
              HOW DPDP READINESS WORKS →
            </Link>
          </div>
        </section>
      )}

      <FaqSection faqs={faqs} />
    </PaperPage>
  );
};

export default DpdpCheck;
