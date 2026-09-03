import { useEffect, useState } from 'react';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { ORIGIN } from '@/components/Seo';
import { resultPath } from '@/lib/teardown/share';

/**
 * The link out of a finished run.
 *
 * It sits directly under `Verdict`, above the gate, and that ordering is the
 * decision: a link exists whether or not the reader hands over an address, so
 * the thing that travels is not gated on the thing that converts.
 *
 * What travels is the verdict, not the report. `/teardown/r/:score` shows a
 * recipient the same ungated result the sharer saw and asks them to run it on
 * their own product; the nine sections stay behind the gate. A shared link is
 * an advertisement for the test, not a copy of it.
 */

export default function Share({ answers }: { answers: number[] }) {
  const url = `${ORIGIN}${resultPath(answers)}`;
  const [copied, setCopied] = useState(false);

  // Reset the confirmation so a second copy still reads as an action. Keyed on
  // `copied` rather than run on click, so the timer is cleaned up on unmount.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access is refused on insecure origins and in some embedded
      // browsers. The input below is the fallback, and it is always there, so
      // there is nothing to report and nothing to recover from.
      setCopied(false);
    }
  };

  return (
    <div>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>SHARE THIS RESULT</p>
      <h2 style={{ margin: px(s[5], 0, 0), ...heading('d5'), color: '#fff', maxWidth: '30ch' }}>
        Send the verdict to whoever owns the roadmap.
      </h2>
      <p style={{ margin: px(s[4], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '54ch' }}>
        The link shows your score and the four axis bars. It does not show the written breakdown, and it
        does not carry your email.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[3], marginTop: s[6], alignItems: 'stretch' }}>
        <input
          readOnly
          value={url}
          aria-label="Link to your result"
          onFocus={(e) => e.currentTarget.select()}
          style={{
            flex: '1 1 260px',
            minWidth: 0,
            background: 'transparent',
            border: `${rule.base}px solid ${c.rule}`,
            color: '#fff',
            font: `400 13px/1 ${mono}`,
            padding: px(s[4], s[4]),
          }}
        />
        <button
          type="button"
          onClick={copy}
          style={{
            background: c.accent,
            border: `${rule.base}px solid ${c.accent}`,
            color: c.ink,
            cursor: 'pointer',
            padding: px(s[4], s[6]),
            ...label(11, 700, 0.14),
          }}
        >
          {copied ? 'COPIED' : 'COPY LINK'}
        </button>
      </div>

      {/* The button reports through this rather than by swapping its own label
          alone: a label change inside a button is not announced. */}
      <p aria-live="polite" style={{ margin: px(s[4], 0, 0), font: `400 13px/1.5 ${display}`, color: c.dimOnInk }}>
        {copied ? 'Link copied to your clipboard.' : ' '}
      </p>
    </div>
  );
}
