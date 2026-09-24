import { useEffect, useRef } from 'react';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { QUESTIONS, SECTIONS, type Axis } from '@/lib/teardown/questions';
import type { Result } from '@/lib/teardown/score';
import Ladder from './Ladder';

/**
 * The ungated result. Verdict, score, four axis bars, and the thinnest
 * sections named and not elaborated; the elaboration is the report behind the
 * email. When the scores do not support a ranking, the tie is shown instead.
 *
 * The bars use `c.mark`, never `c.signal`. A score is not an availability
 * claim, and the greens are reserved so a green dot on this site still reads
 * as a status light rather than as decoration.
 *
 * `mine` distinguishes the two places this renders. On `/teardown` it is the
 * run the reader just finished, sitting under the page's own `h1`, reached by
 * a phase transition that has to move focus. On `/teardown/r/:score` it is a
 * stranger's result, it is the only heading on the page, and it mounts on
 * arrival, where moving focus would be a yank rather than a transition.
 */

const AXIS_LABEL: Record<Axis, string> = {
  defensibility: 'DEFENSIBILITY',
  failure: 'FAILURE DESIGN',
  cost: 'COST FLOOR',
  evaluation: 'EVALUATION',
};

const AXIS_QUESTION: Record<Axis, string> = {
  defensibility: "What's left if the vendor ships this?",
  failure: 'What happens when the model is wrong or down?',
  cost: 'Do the unit economics survive scale?',
  evaluation: 'How would you know quality got worse?',
};

const Bar = ({ axis, value }: { axis: Axis; value: number }) => (
  <div style={{ display: 'grid', gap: s[2] }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: s[4] }}>
      <span style={{ ...label(10, 700, 0.14), color: '#fff' }}>{AXIS_LABEL[axis]}</span>
      <span style={{ font: `700 11px/1 ${mono}`, color: c.mark }}>{value}</span>
    </div>
    <div style={{ height: rule.base, background: c.rule }}>
      <div style={{ height: '100%', width: `${value}%`, background: c.mark }} />
    </div>
    <span style={{ font: `400 13px/1.4 ${display}`, color: c.dimOnInk }}>{AXIS_QUESTION[axis]}</span>
  </div>
);

export default function Verdict({ result, mine = true }: { result: Result; mine?: boolean }) {
  const axes: Axis[] = ['defensibility', 'failure', 'cost', 'evaluation'];

  // When `mine`, this mounts on the Quiz -> Verdict phase transition and is
  // never in the prerendered page, so focusing is a deliberate transition.
  // A shared result mounts on arrival instead, where the same call would be a
  // yank, so it neither focuses nor advertises itself as a focus target.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (mine) headingRef.current?.focus();
  }, [mine]);

  // The shared page carries no other heading, so the verdict is its `h1`.
  const Heading = mine ? 'h2' : 'h1';

  // Three slots over nine sections: the cut can land inside a tie, and a level
  // run has no thinnest section at all. The eyebrow says which of those this
  // is, so the list never claims a ranking the scores do not support.
  const { ranked, tied, tiedScore } = result.thinnest;
  const eyebrow =
    ranked.length === 3 ? 'THINNEST THREE' : ranked.length > 0 ? 'THINNEST SECTIONS' : 'NO THINNEST SECTION';

  return (
    <div>
      {/*
        The shared page cannot tell the sharer from the recipient: it is
        prerendered, carries no identity, and `?a=` is only packed answers.
        So the eyebrow asserts nothing about who is reading — it says what the
        thing is, which stays true whether the taker is previewing their own
        link or a stranger has just opened it.
      */}
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>
        {mine ? 'YOUR RESULT' : 'WRAPPER TEST RESULT'}
      </p>

      <Heading
        ref={headingRef}
        tabIndex={mine ? -1 : undefined}
        style={{
          margin: px(s[5], 0, 0),
          ...heading('d3'),
          textTransform: 'uppercase',
          color: c.accent,
          maxWidth: '16ch',
        }}
      >
        {result.verdict}
      </Heading>

      <p style={{ margin: px(s[4], 0, 0), font: `700 20px/1 ${mono}`, color: '#fff' }}>
        {result.score}
        <span style={{ color: c.dimOnInk }}>/100</span>
      </p>

      {result.undecidedCount > 0 && (
        <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '54ch' }}>
          {result.undecidedCount} of {QUESTIONS.length} answers were <em>I&rsquo;m not sure</em>. Those are counted apart from
          low scores: an undecided question and a badly decided one are different problems.
        </p>
      )}

      <Ladder score={result.score} verdict={result.verdict} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: s[7],
          marginTop: s[9],
        }}
      >
        {axes.map((a) => (
          <Bar key={a} axis={a} value={result.axes[a]} />
        ))}
      </div>

      <div style={{ marginTop: s[10], borderTop: `${rule.base}px solid ${c.rule}`, paddingTop: s[6] }}>
        <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>{eyebrow}</p>

        {ranked.length > 0 && (
          <ol style={{ margin: px(s[5], 0, 0), padding: 0, listStyle: 'none', display: 'grid', gap: s[3] }}>
            {ranked.map((id) => (
              <li key={id} style={{ display: 'flex', gap: s[4], alignItems: 'baseline' }}>
                <span style={{ font: `700 11px/1 ${mono}`, color: c.dimOnInk }}>
                  {String(id).padStart(2, '0')}
                </span>
                <span style={{ ...heading('d6'), color: '#fff' }}>{SECTIONS[id]}</span>
                <span style={{ font: `700 13px/1 ${mono}`, color: c.dimOnInk }}>
                  {result.sectionScores[id]}
                </span>
              </li>
            ))}
          </ol>
        )}

        {tied.length > 0 && (
          <p
            style={{
              margin: px(ranked.length > 0 ? s[6] : s[5], 0, 0),
              font: `400 15px/1.55 ${display}`,
              color: c.dimOnInk,
              maxWidth: '54ch',
            }}
          >
            {ranked.length > 0 ? 'The rest tie' : 'Every section scored the same'} at {tiedScore}
            {ranked.length > 0 ? ': ' : ' — '}
            {tied.map((id) => SECTIONS[id]).join(', ')}
            {ranked.length > 0
              ? '. Naming three of them would be picking by section order, not by score.'
              : '. Nothing came out thinner than anything else.'}
          </p>
        )}
      </div>
    </div>
  );
}
