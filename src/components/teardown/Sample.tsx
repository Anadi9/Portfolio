import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { QUESTIONS, sampleFor } from '@/lib/teardown/questions';

/**
 * One question from the bank, printed verbatim with its weights.
 *
 * Every other thing on a shared result is output: a number, a band, four bars,
 * a list of thin sections. All of it asks a stranger to trust the machine. This
 * is the only element that shows the input, and it is the one a sceptical
 * reader can actually judge — either the question is one they have been avoiding
 * or it is not, and no amount of surrounding copy settles that for them.
 *
 * The weights are printed alongside because they are the claim the ladder makes
 * one step up ("each answer weighted 0 to 3"), and a claim shown is worth more
 * than a claim stated.
 *
 * It renders as prose, not as buttons. A clickable question here would be a
 * second, one-item quiz whose answer goes nowhere; the whole point of the page
 * is to send the reader to the real one.
 */

export default function Sample({ score }: { score: number }) {
  const q = sampleFor(score);
  const number = QUESTIONS.indexOf(q) + 1;

  return (
    <div>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>ONE OF THE QUESTIONS</p>
      <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '54ch' }}>
        Number {number} of {QUESTIONS.length}, worded exactly as the test asks it. The number beside each
        answer is what it scores.
      </p>

      <p style={{ ...heading('d6'), color: '#fff', margin: px(s[8], 0, s[6]), maxWidth: '52ch' }}>{q.prompt}</p>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: s[3], maxWidth: '52ch' }}>
        {q.options.map((o) => (
          <li
            key={o.label}
            style={{
              display: 'flex',
              gap: s[5],
              alignItems: 'baseline',
              padding: px(s[5], s[5]),
              border: `${rule.base}px solid ${o.unknown ? c.rule : c.ruleSoft}`,
              font: `400 15px/1.45 ${display}`,
              color: o.unknown ? c.dimOnInk : '#fff',
            }}
          >
            <span style={{ font: `700 13px/1.45 ${mono}`, color: c.dimOnInk }}>{o.weight}</span>
            <span>{o.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
