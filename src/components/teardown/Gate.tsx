import { useState } from 'react';
import { c, display, heading, label, px, rule, s } from '@/components/portfolio/tokens';

/**
 * The one thing on this page that is asked for.
 *
 * The gate is a courtesy, not a lock: the report is computed in the browser
 * from data already in the bundle, so anyone reading source has it for free.
 * That is decision 5 of the spec and it is fine: hardening it would mean
 * moving the report server-side and paying a round trip on every reveal, to
 * protect something given away.
 *
 * The honeypot is a real input, positioned off-screen rather than hidden with
 * `display:none`, since some bots skip anything undisplayed. It is `aria-hidden`
 * and out of the tab order, so nobody using the page ever meets it.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Gate({ onSubmit }: { onSubmit: (email: string, honeypot: string) => void }) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [touched, setTouched] = useState(false);

  const invalid = touched && !EMAIL.test(email);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (EMAIL.test(email)) onSubmit(email, honeypot);
      }}
      style={{ maxWidth: '52ch' }}
    >
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>THE WRITTEN BREAKDOWN</p>
      <h3 style={{ margin: px(s[5], 0, 0), ...heading('d5'), textTransform: 'uppercase', color: '#fff' }}>
        All nine sections
      </h3>
      <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk }}>
        What every answer indicates, section by section, and which of them you haven&rsquo;t decided yet.
        <span style={{ color: c.mark }}>It opens here straight away;</span> the email is so you keep a copy.
      </p>

      <div style={{ display: 'flex', gap: s[3], flexWrap: 'wrap', marginTop: s[7] }}>
        <label htmlFor="td-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Email address
        </label>
        <input
          id="td-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'td-email-error' : undefined}
          style={{
            flex: '1 1 240px',
            padding: px(s[4], s[5]),
            background: 'transparent',
            border: `${rule.base}px solid ${invalid ? c.mark : c.ruleSoft}`,
            color: '#fff',
            font: `400 15px/1.2 ${display}`,
          }}
        />
        <button
          type="submit"
          className="pf-nudge pf-nudge-lg"
          style={{
            padding: px(s[4], s[5]),
            background: c.accent,
            color: c.ink,
            border: 0,
            ...label(11, 700, 0.12),
            cursor: 'pointer',
          }}
        >
          OPEN THE BREAKDOWN
        </button>

        {/* Honeypot. Off-screen rather than `display:none`. */}
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />
      </div>

      {invalid && (
        <p id="td-email-error" style={{ margin: px(s[4], 0, 0), font: `400 13px/1.4 ${display}`, color: c.mark }}>
          That doesn&rsquo;t look like an email address.
        </p>
      )}
    </form>
  );
}
