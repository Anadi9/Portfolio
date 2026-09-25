import { useEffect, useState } from 'react';
import { track } from '@vercel/analytics';
import { LATEST, PACK_IDS, pack, type PackId } from '@/data/kit';
import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { nudge as nudgeFor, total, type PriceTable } from '@/lib/kit/packs';
import { formatMoney, type KitCurrency } from '@/lib/kit/product';
import { body, cta, eyebrow, hint, p } from './styles';

/**
 * The pack picker: a fieldset of real checkboxes, one card per pack, and a
 * total with the checkout button. The selection itself belongs to the page
 * (it lives in the URL); this renders it and sends it to `/api/kit/checkout`,
 * which is where the price is decided. Only pack ids leave the browser.
 */

/** The checkbox, and how far the file list sits in so it lines up with the card's text. */
const BOX = 20;
const INDENT = BOX + s[4];

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'failed'; message: string; mail?: boolean };

export default function PackPicker({
  selected,
  onToggle,
  onSwitchToFull,
  currency,
  table,
  devPrices,
}: {
  selected: PackId[];
  onToggle: (id: PackId, on: boolean) => void;
  onSwitchToFull: () => void;
  currency: KitCurrency;
  table: PriceTable;
  /** The build couldn't reach Stripe: the prices are the manifest's suggestions. Never true in production. */
  devPrices: boolean;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const sum = total(selected, table);
  const nudge = nudgeFor(selected, table, currency);
  const money = (minor: number) => formatMoney(currency, minor);
  const nudgeKey = nudge ? `${nudge.kind}:${selected.join(',')}` : '';

  useEffect(() => {
    if (nudgeKey) track('nudge_shown', { picks: nudgeKey.split(':')[1] });
  }, [nudgeKey]);

  const checkout = async () => {
    track('checkout_started', { packs: selected.join(','), count: selected.length });
    setStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/kit/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIds: selected }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (res.status === 501) setStatus({ kind: 'failed', message: 'Checkout isn’t switched on yet. Email me and I’ll send the kit directly.', mail: true });
      else if (res.status === 400 || res.status === 503 || res.status === 429) setStatus({ kind: 'failed', message: data.error ?? 'Checkout didn’t open.', mail: res.status === 503 });
      else setStatus({ kind: 'failed', message: 'Checkout didn’t open. Try again in a moment.' });
    } catch {
      setStatus({ kind: 'failed', message: 'Checkout didn’t open. Check your connection and try again.' });
    }
  };

  const empty = selected.length === 0;
  const summary = empty
    ? 'Nothing picked yet.'
    : selected.includes('full')
      ? `The full kit${sum !== null ? ` · ${money(sum)}` : ''}`
      : `${selected.length} ${selected.length === 1 ? 'pack' : 'packs'}${sum !== null ? ` · ${money(sum)}` : ''}`;

  return (
    <div style={{ display: 'grid', gap: s[6] }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'grid', gap: s[4] }}>
        <legend style={{ ...eyebrow, padding: 0, marginBottom: s[4] }}>PICK ONE OR MORE · VERSION {LATEST.version}</legend>
        {PACK_IDS.map((id) => (
          <PackCard
            key={id}
            id={id}
            checked={selected.includes(id)}
            price={table[id] !== undefined ? money(table[id]!) : null}
            onChange={(on) => {
              if (on) track('pack_selected', { pack: id });
              onToggle(id, on);
            }}
          />
        ))}
        {devPrices && <p style={hint}>Dev: suggested prices from the kit’s manifest, not from Stripe.</p>}
      </fieldset>

      <div data-kit-total style={{ display: 'grid', gap: s[4], padding: px(s[5], 0), background: c.paper, borderTop: `${rule.edge}px solid ${c.ink}` }}>
        {nudge && (
          <div style={{ display: 'grid', gap: s[3], justifyItems: 'start', padding: px(s[4], s[5]), background: c.accent }}>
            <p style={{ ...body, color: p.ink }}>
              {nudge.kind === 'save' && `Your picks cost ${money(nudge.picks)}. Get everything for ${money(nudge.full)} and save ${money(nudge.diff)}.`}
              {nudge.kind === 'more' && `For ${money(nudge.diff)} more, get everything.`}
              {nudge.kind === 'same' && `Your picks cost the same as everything. Get the full kit for ${money(nudge.full)}.`}
            </p>
            <button
              type="button"
              className="pf-underline"
              onClick={() => {
                track('nudge_accepted', { picks: selected.join(',') });
                onSwitchToFull();
              }}
              style={{ ...label(11, 700, 0.14), color: p.ink, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              SWITCH TO THE FULL KIT →
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: s[4] }}>
          <p aria-live="polite" style={{ margin: 0, font: `600 17px/1.3 ${display}`, color: p.ink }}>
            {summary}
          </p>
          <button
            type="button"
            onClick={checkout}
            disabled={empty || sum === null || status.kind === 'loading'}
            aria-describedby={empty ? 'kit-pick-hint' : undefined}
            className="pf-nudge pf-nudge-lg"
            style={{ ...cta, opacity: empty || sum === null || status.kind === 'loading' ? 0.5 : 1, cursor: empty ? 'not-allowed' : 'pointer' }}
          >
            {status.kind === 'loading' ? 'OPENING CHECKOUT…' : 'CHECKOUT'}
            <span aria-hidden>→</span>
          </button>
        </div>
        {empty ? (
          <p id="kit-pick-hint" style={hint}>
            Pick at least one pack.
          </p>
        ) : (
          <p style={hint}>One-time payment through Stripe. Your download link on the next page and by email.</p>
        )}
        {status.kind === 'failed' && (
          <p role="alert" style={{ ...hint, color: p.error }}>
            {status.message}{' '}
            {status.mail && (
              <a href="mailto:anadithakur99@gmail.com?subject=The%20Production%20Kit" style={{ color: p.ink }}>
                anadithakur99@gmail.com
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function PackCard({ id, checked, price, onChange }: { id: PackId; checked: boolean; price: string | null; onChange: (on: boolean) => void }) {
  const info = pack(id);
  const full = id === 'full';
  const ink = full ? c.paper : p.ink;
  const muted = full ? c.bright : p.body;
  const inputId = `kit-pack-${id}`;

  return (
    <div
      data-kit-pack
      style={{
        display: 'grid',
        background: full ? c.plate : checked ? c.accent : c.paper,
        border: `${checked ? rule.edge : rule.hair}px solid ${checked ? (full ? c.mark : c.ink) : p.rule}`,
      }}
    >
      <label
        htmlFor={inputId}
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: px(s[2], s[4]), alignItems: 'start', padding: px(s[5], s[5], s[3]), cursor: price ? 'pointer' : 'not-allowed' }}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={!price}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: BOX, height: BOX, margin: px(s[1], 0, 0), accentColor: full ? c.mark : c.ink, cursor: 'inherit' }}
        />
        <span style={{ display: 'grid', gap: s[2], minWidth: 0 }}>
          {full && <span style={{ ...label(10, 700, 0.16), color: c.mark }}>EVERYTHING</span>}
          <span style={{ font: `700 18px/1.25 ${display}`, color: ink }}>{info.name}</span>
          <span style={{ font: `500 15px/1.45 ${display}`, color: ink }}>
            {full ? 'Everything in all five packs, plus the Next.js server setup and Stripe webhook.' : info.problem}
          </span>
          <span style={{ font: `400 14px/1.5 ${display}`, color: muted }}>{full ? info.problem : info.tagline}</span>
        </span>
        <span style={{ font: `700 18px/1.25 ${display}`, color: ink, whiteSpace: 'nowrap' }}>{price ?? 'Not available'}</span>
      </label>
      <details style={{ padding: px(0, s[5], s[4]) }}>
        <summary style={{ ...label(10, 700, 0.14), color: full ? c.dimOnInk : p.dim, cursor: 'pointer', padding: px(s[2], 0), marginLeft: INDENT }}>
          WHAT’S INSIDE ({info.files.length} FILES)
        </summary>
        <ul style={{ listStyle: 'none', margin: px(s[2], 0, 0, INDENT), padding: 0, display: 'grid', gap: s[1] }}>
          {info.files.map((f) => (
            <li key={f} style={{ font: `400 13px/1.5 ${mono}`, color: muted, overflowWrap: 'anywhere' }}>
              {f}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
