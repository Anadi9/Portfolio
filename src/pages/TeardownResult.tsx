import { useEffect, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, mono, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import Ladder from '@/components/teardown/Ladder';
import Sample from '@/components/teardown/Sample';
import Verdict from '@/components/teardown/Verdict';
import { QUESTIONS } from '@/lib/teardown/questions';
import { band, score as scoreOf } from '@/lib/teardown/score';
import { decodeAnswers, resultPaths } from '@/lib/teardown/share';
import NotFound from './NotFound';

/**
 * `/teardown/r/:score`: a shared Wrapper Test result.
 *
 * Forty of these prerender, one per reachable score, because the score is the
 * only part of a result a crawler reads: it sets the title and picks the OG
 * card, and both have to be in static HTML by the time a link is first pasted
 * anywhere. The answers ride in `?a=`, which no crawler parses and none needs
 * to — with the query the page draws the real axis bars, and without it, the
 * band and the number, which is exactly what the card already said.
 *
 * The query is read after mount rather than during render. The prerendered
 * HTML cannot know it, so reading it on the first client render would hydrate
 * different markup than the server sent.
 *
 * `noindex, follow`: forty near-duplicate pages would dilute a corpus this
 * small, but a shared link should still pass what it earns to `/teardown`.
 */

const section = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${c.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
} as const;

/** The verdict with its emoji stripped, for a `<title>` and a description. */
const words = (verdict: string) =>
  verdict
    .replace(/[^A-Za-z, ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function TeardownResult() {
  // Stream the score out of the path rather than through `useParams`, the way
  // `NoteRoute` does: one convention for reading a dynamic segment.
  const [, , , param] = useLocation().pathname.split('/');
  const pathScore = Number(param);
  const known = resultPaths().includes(`/teardown/r/${pathScore}`);

  const [answers, setAnswers] = useState<number[] | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('a');
    const decoded = decodeAnswers(code);
    // A code that does not score to the path it arrived on is a link somebody
    // edited. Rather than argue with them, fall back to the score-only view,
    // which is what the card they shared claims anyway.
    if (decoded && scoreOf(decoded).score === pathScore) setAnswers(decoded);
  }, [pathScore]);

  // A score no run can produce, so a hand-edited or truncated link. Nothing was
  // prerendered at this path either; this is the client-side navigation case.
  if (!known) return <NotFound />;

  const verdict = band(pathScore);

  const title = `${pathScore}/100 on the Wrapper Test: ${words(verdict).toLowerCase()}`;
  const description =
    `A Wrapper Test result: ${pathScore} out of 100 on defensibility, failure design, cost floor and ` +
    `evaluation. Score your own AI product with the free ${QUESTIONS.length}-question diagnostic.`;

  return (
    <div style={{ background: c.ink, color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo
        title={title}
        description={description}
        path={`/teardown/r/${pathScore}`}
        type="website"
        image={`/og/teardown/${pathScore}.png`}
        robots="noindex, follow"
      />

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
          <Link to="/work-with-me" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.dimOnInk }}>
            WORK WITH ME
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <section aria-label="A shared result" style={{ ...section, borderTop: 'none' }}>
          {answers ? (
            // `Verdict` prints its own eyebrow and heading in the shared voice,
            // so the score-only branch below is the only one that writes them.
            <Verdict result={scoreOf(answers)} mine={false} />
          ) : (
            <>
              <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>WRAPPER TEST RESULT</p>
              <h1
                style={{
                  margin: px(s[5], 0, 0),
                  ...heading('d3'),
                  textTransform: 'uppercase',
                  color: c.accent,
                  maxWidth: '16ch',
                }}
              >
                {verdict}
              </h1>
              <p style={{ margin: px(s[4], 0, 0), font: `700 20px/1 ${mono}`, color: '#fff' }}>
                {pathScore}
                <span style={{ color: c.dimOnInk }}>/100</span>
              </p>
              <Ladder score={pathScore} verdict={verdict} />
            </>
          )}
        </section>

        {/*
          Sits between the result and the ask, and only on this page: the reader
          who just took the test has seen all thirteen, but the stranger holding
          somebody else's score has seen none of them.
        */}
        <section aria-label="One of the questions" style={section}>
          <Sample score={pathScore} />
        </section>

        <section aria-label="Take the test" style={section}>
          <h2 style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>
            Now score <span style={{ color: c.mark }}>your</span> product
          </h2>
          <p
            style={{
              margin: px(s[6], 0, 0),
              font: `400 17px/1.5 ${display}`,
              color: c.dimOnInk,
              maxWidth: '58ch',
              textWrap: 'pretty',
            }}
          >
            The same {QUESTIONS.length}, about your own AI feature. Three minutes, and a written breakdown
            of where it is thin. It scores your answers, not a guess about your product.
          </p>
          {/*
            The default suspicion about any scored quiz is that the score is
            bait for an address. That is the one objection standing between a
            reader of somebody else's result and a run of their own, so it gets
            its own line beside the button rather than a clause in a paragraph.
          */}
          <p
            style={{
              margin: px(s[6], 0, 0),
              font: `700 15px/1.5 ${display}`,
              color: '#fff',
              maxWidth: '58ch',
            }}
          >
            Your result appears straight away. No email is asked for to see it.
          </p>
          <p style={{ marginTop: s[8] }}>
            <Link
              to="/teardown"
              style={{
                display: 'inline-block',
                background: c.accent,
                color: c.ink,
                textDecoration: 'none',
                padding: px(s[5], s[8]),
                ...label(12, 700, 0.14),
              }}
            >
              TAKE THE WRAPPER TEST
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
