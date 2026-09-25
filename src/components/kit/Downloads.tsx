import { useState } from 'react';
import { track } from '@vercel/analytics';
import type { PackId } from '@/data/kit';
import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import { body, cta, hint, p } from './styles';

/** Shared by `/kit/thanks` and `/kit/downloads/<token>`. */

export type Offer = { due: number; label: string } | null;

const MAIL = 'anadithakur99@gmail.com';

export const MailLink = ({ subject = 'The Production Kit' }: { subject?: string }) => (
  <a href={`mailto:${MAIL}?subject=${encodeURIComponent(subject)}`} style={{ color: p.ink }}>
    {MAIL}
  </a>
);

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const downloadHref = (token: string, pack: PackId, version?: string) =>
  `/api/kit/download?${new URLSearchParams({ token, pack, ...(version && { version }) })}`;

/** One pack, with a button per version, newest first. */
export function PackDownload({ token, id, name, versions }: { token: string; id: PackId; name: string; versions: { version: string; bytes: number }[] }) {
  const [latest, ...older] = versions;
  return (
    <li style={{ display: 'grid', gap: s[3], padding: px(s[5], 0), borderBottom: `${rule.hair}px solid ${p.rule}` }}>
      <span style={{ font: `700 18px/1.3 ${display}`, color: p.ink }}>{name}</span>
      <a href={downloadHref(token, id, latest.version)} onClick={() => track('kit_download', { pack: id })} className="pf-nudge pf-nudge-lg" style={{ ...cta, justifySelf: 'start' }}>
        DOWNLOAD VERSION {latest.version} (.ZIP, {kb(latest.bytes)})<span aria-hidden>↓</span>
      </a>
      {older.length > 0 && (
        <p style={hint}>
          Earlier versions:{' '}
          {older.map((v, i) => (
            <span key={v.version}>
              {i > 0 && ', '}
              <a href={downloadHref(token, id, v.version)} style={{ color: p.ink }}>
                {v.version}
              </a>
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

/**
 * "Upgrade to everything for $X". The amount on the button is the server's;
 * clicking sends only the token, and the server works it out again.
 */
export function UpgradeBox({ token, offer, onGranted }: { token: string; offer: NonNullable<Offer>; onGranted: () => void }) {
  const [state, setState] = useState<{ kind: 'idle' | 'loading' } | { kind: 'failed'; message: string }>({ kind: 'idle' });

  const go = async () => {
    track('kit_upgrade_click', { free: offer.due === 0 });
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/kit/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; granted?: boolean; error?: string };
      if (res.ok && data.url) return window.location.assign(data.url);
      if (res.ok && data.granted) return onGranted();
      setState({ kind: 'failed', message: data.error ?? 'The upgrade didn’t open. Try again in a moment.' });
    } catch {
      setState({ kind: 'failed', message: 'The upgrade didn’t open. Check your connection and try again.' });
    }
  };

  return (
    <div style={{ display: 'grid', gap: s[4], padding: px(s[7], s[7]), background: c.accent, justifyItems: 'start' }}>
      <span style={{ ...label(10, 700, 0.16), color: p.body }}>WANT EVERYTHING?</span>
      <p style={{ ...body, color: p.ink }}>
        {offer.due === 0
          ? 'What you’ve paid for packs already covers the full kit. Claim it at no charge.'
          : `The full kit, for its price minus what you’ve already paid for packs.`}
      </p>
      <button type="button" onClick={go} disabled={state.kind === 'loading'} className="pf-nudge pf-nudge-lg" style={{ ...cta, opacity: state.kind === 'loading' ? 0.6 : 1 }}>
        {state.kind === 'loading' ? 'ONE MOMENT…' : offer.due === 0 ? 'GET THE FULL KIT FREE' : `UPGRADE TO EVERYTHING FOR ${offer.label}`}
        <span aria-hidden>→</span>
      </button>
      {state.kind === 'failed' && (
        <p role="alert" style={{ ...hint, color: p.error }}>
          {state.message}
        </p>
      )}
    </div>
  );
}
