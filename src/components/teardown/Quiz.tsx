import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { QUESTIONS } from '@/lib/teardown/questions';

/**
 * One question at a time, on ink.
 *
 * The parent owns the answers array, which is what makes the whole quiz
 * replayable and what keeps this component free of effects. `current` is the
 * first unanswered index, so answering advances and the Back button rewinds by
 * clearing — there is no separate cursor to drift out of step with the data.
 *
 * Options are real `<button>`s inside a `<fieldset>`: native focus, native
 * Enter and Space, and a legend a screen reader announces as the group's name.
 * No `data-*` attributes here — `usePortfolioMotion` mounts on the front page
 * alone, so anything marked for it would simply never animate.
 */

const optionStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left' as const,
  padding: px(s[5], s[5]),
  background: 'transparent',
  border: `${rule.base}px solid ${c.ruleSoft}`,
  color: '#fff',
  font: `400 15px/1.45 ${display}`,
  cursor: 'pointer',
} as const;

export default function Quiz({
  answers,
  onAnswer,
}: {
  answers: (number | null)[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
}) {
  const current = answers.findIndex((a) => a === null);
  if (current === -1) return null;

  const q = QUESTIONS[current];
  const done = current;
  const pct = Math.round((done / QUESTIONS.length) * 100);

  return (
    <div style={{ maxWidth: '52ch' }}>
      {/* Progress: a rule that fills, not a widget. Same hairline as everywhere else. */}
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={QUESTIONS.length}
        aria-label="Questions answered"
        style={{ height: rule.base, background: c.rule, marginBottom: s[5] }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: c.mark, transition: 'width 200ms ease' }} />
      </div>

      <p style={{ ...label(10, 700, 0.16), color: c.dimOnInk, margin: 0, font: `700 10px/1.4 ${mono}` }}>
        {String(current + 1).padStart(2, '0')} / {QUESTIONS.length}
      </p>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ ...heading('d6'), color: '#fff', padding: 0, margin: px(s[4], 0, s[7]) }}>
          {q.prompt}
        </legend>

        <div style={{ display: 'grid', gap: s[3] }}>
          {q.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              className="pf-outline pf-nudge"
              style={{
                ...optionStyle,
                borderColor: o.unknown ? c.rule : c.ruleSoft,
                color: o.unknown ? c.dimOnInk : '#fff',
              }}
              onClick={() => onAnswer(current, i)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      {current > 0 && (
        <button
          type="button"
          className="pf-underline"
          style={{
            ...label(11, 700, 0.14),
            marginTop: s[6],
            background: 'none',
            border: 0,
            padding: 0,
            color: c.dimOnInk,
            cursor: 'pointer',
          }}
          onClick={() => onAnswer(current - 1, -1)}
        >
          ← BACK
        </button>
      )}
    </div>
  );
}
