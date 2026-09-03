import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { QUESTIONS } from '@/lib/teardown/questions';
import { BANDS, type VerdictBand } from '@/lib/teardown/score';

/**
 * The band ladder: every threshold the rubric holds, with a score placed among
 * them.
 *
 * A bare `33/100` asks to be believed. The same 33 against four fixed
 * thresholds is checkable, and it shows the bands were written before the run
 * rather than fitted to it — which is most of the reason a stranger who lands
 * on somebody else's result would spend three minutes on one of their own.
 *
 * It takes a score and a band rather than a `Result` so the shared page can
 * draw it on the score-only branch too. That branch is the prerendered one, so
 * it is what a crawler and a reader without the `?a=` code see, and a number
 * with no scale is exactly the thing they should not be left holding.
 */
export default function Ladder({ score, verdict }: { score: number; verdict: VerdictBand }) {
  return (
    <div style={{ marginTop: s[10], borderTop: `${rule.base}px solid ${c.rule}`, paddingTop: s[6] }}>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>HOW THIS IS SCORED</p>
      <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '54ch' }}>
        {QUESTIONS.length} questions, each answer weighted 0 to 3, against these four fixed bands.
      </p>

      <ul style={{ margin: px(s[6], 0, 0), padding: 0, listStyle: 'none', display: 'grid', gap: s[3] }}>
        {BANDS.map((b, i) => {
          const here = b.verdict === verdict;
          // The band above starts one point past this one's ceiling; the first
          // has no band above it, so it runs to 100.
          const max = i === 0 ? 100 : BANDS[i - 1].min - 1;
          return (
            <li
              key={b.verdict}
              aria-current={here ? 'true' : undefined}
              style={{ display: 'flex', gap: s[4], alignItems: 'baseline', color: here ? '#fff' : c.dimOnInk }}
            >
              <span style={{ font: `700 12px/1.4 ${mono}`, minWidth: '7ch' }}>
                {b.min}&ndash;{max}
              </span>
              <span style={{ font: `${here ? 700 : 400} 15px/1.4 ${display}` }}>{b.verdict}</span>
              {here && <span style={{ font: `700 11px/1.4 ${mono}`, color: c.mark }}>&larr; {score}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
