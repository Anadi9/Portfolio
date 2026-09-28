import { track } from '@vercel/analytics';
import { FREE_KIT, type PackId } from '@/data/kit';
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
        Download version {latest.version} (.zip, {kb(latest.bytes)})<span aria-hidden>↓</span>
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
 * Where the paid upgrade used to be. The full kit is a free download now, so a
 * buyer of one pack is pointed at it instead of being offered a charge for it.
 * The upgrade endpoint still exists server-side; nothing links to it.
 */
export function FreeKitNote({ where }: { where: string }) {
  return (
    <div style={{ display: 'grid', gap: s[4], padding: px(s[7], s[7]), background: c.accent, justifyItems: 'start' }}>
      <span style={{ ...label(10, 700, 0.16), color: p.body }}>WANT EVERYTHING?</span>
      <p style={{ ...body, color: p.ink }}>
        The full kit is now free for everyone. It has every pack in it, so there’s nothing to upgrade or pay for.
      </p>
      <a
        href={FREE_KIT.href}
        download
        onClick={() => track('kit_free_download', { where })}
        className="pf-nudge pf-nudge-lg"
        style={cta}
      >
        Download the full kit, free<span aria-hidden>↓</span>
      </a>
    </div>
  );
}
