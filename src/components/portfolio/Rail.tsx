import { c, heading, label, mono, px, rule, s } from './tokens';
import { nav, site } from '@/data/portfolio';

const chip: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 26,
  height: 26,
  border: `${rule.hair}px solid ${c.ink}`,
  font: `700 10px ${mono}`,
  textDecoration: 'none',
  color: c.ink,
  transition: 'background .2s, border-color .2s, color .2s',
};

const statNum: React.CSSProperties = {
  ...heading('d6', { fixed: true }),
  color: c.ink,
};

const statSub: React.CSSProperties = {
  ...label(10, 500, 0.1),
  lineHeight: 1.3,
  color: c.dim,
  marginTop: s[1],
};

const logoChip: React.CSSProperties = {
  flex: 'none',
  padding: px(s[1], s[2]),
  border: `${rule.hair}px solid rgba(10,10,10,.3)`,
  ...label(10, 700, 0.08),
  color: c.ink,
};

/**
 * Fixed left rail: identity, stats, section nav, client ticker, contact CTA.
 *
 * Styled once, in ink-on-paper. It used to carry a second full set of colours
 * that JavaScript swapped in over the dark sections; the inversion is now done
 * optically by `[data-rail-invert]` (see the seam block in
 * `usePortfolioMotion`) so there is exactly one source of truth for how the
 * rail looks.
 */
const Rail = () => (
  <aside
    data-rail="1"
    style={{
      position: 'sticky',
      top: 0,
      flex: 'none',
      width: 264,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: c.paper,
      // Inset rather than a real border, so it sits inside the padding box and
      // the inversion band covers it. A real border-right would stay ink over
      // the dark sections and the seam between rail and page would vanish.
      boxShadow: `inset -${rule.edge}px 0 0 ${c.ink}`,
      zIndex: 60,
    }}
  >
    <div
      data-rail-header="1"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: s[5],
        borderBottom: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: s[3] }}>
        <span
          style={{
            width: 26,
            height: 26,
            background: c.accent,
            border: `${rule.hair}px solid ${c.ink}`,
            display: 'block',
          }}
        />
        <span data-rail-name="1" style={{ ...label(12, 700, 0.12), color: c.ink }}>
          ANADI
          <br />
          THAKUR
        </span>
      </div>
      <div data-rail-chips="1" style={{ display: 'flex', gap: s[1] }}>
        <a href={site.github} target="_blank" rel="noreferrer" data-rail-chip="1" style={chip} aria-label="GitHub">
          GH
        </a>
        <a href={site.linkedin} target="_blank" rel="noreferrer" data-rail-chip="1" style={chip} aria-label="LinkedIn">
          IN
        </a>
      </div>
    </div>

    <div
      data-rail-stats="1"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderBottom: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <div style={{ padding: px(s[4], s[4]), borderRight: `${rule.hair}px solid rgba(10,10,10,.25)` }}>
        <div style={statNum}>
          {site.years}
          <span style={{ color: c.markOnPaper }}>+</span>
        </div>
        <div style={statSub}>
          YEARS
          <br />
          SHIPPING
        </div>
      </div>
      <div style={{ padding: px(s[4], s[4]) }}>
        <div style={statNum}>{site.releases}</div>
        <div style={statSub}>
          PRODUCTION
          <br />
          RELEASES
        </div>
      </div>
    </div>

    <nav data-rail-nav="1" style={{ flex: 1, padding: px(s[3], 0), overflow: 'auto' }}>
      {nav.map((n) => (
        <a
          key={n.id}
          href={n.href ?? `#${n.id}`}
          data-nav={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: s[3],
            padding: px(s[2], s[5]),
            ...label(11, 700, 0.14),
            color: c.ink,
            textDecoration: 'none',
            transition: 'color .2s',
          }}
        >
          <span data-navdot="1" style={{ width: 7, height: 7, background: 'transparent', display: 'block' }} />
          {n.label}
        </a>
      ))}
    </nav>

    <div data-rail-ticker="1" style={{ borderTop: `${rule.base}px solid ${c.ink}`, overflow: 'hidden' }}>
      <div style={{ ...label(10, 500, 0.14), color: c.dim, padding: px(s[3], s[5], s[1]) }}>SHIPPED FOR</div>
      {/* Both halves carry the full list, and the track is sized by content
          rather than 200% of the rail. It used to split the six clients three
          and three into two 50% halves: -50% only reads as seamless when the
          second half repeats the first, so the loop visibly reset every 22s,
          and six chips are far wider than the 264px half they were given, so
          they overlapped. max-content makes -50% exactly one group wide. */}
      <div
        data-tick="1"
        style={{ display: 'flex', width: 'max-content', animation: 'pf-tick 22s linear infinite', paddingBottom: s[3] }}
      >
        {[0, 1].map((group) => (
          <div key={group} style={{ flex: 'none', display: 'flex', gap: s[3], paddingLeft: s[3] }}>
            {site.clients.map((client) => (
              <span key={client} style={logoChip}>
                {client}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>

    <button
      type="button"
      data-copy={site.email}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: s[2],
        width: '100%',
        padding: px(s[3], s[5]),
        background: 'transparent',
        border: 0,
        borderTop: `${rule.base}px solid ${c.ink}`,
        ...label(11, 500, 0.04),
        color: c.ink,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span data-copy-label="1">{site.email}</span>
      <span style={{ color: c.markOnPaper, fontWeight: 700 }}>COPY</span>
    </button>

    <a
      href="#contact"
      data-rail-cta="1"
      className="pf-nudge"
      style={{
        // Painted above the inversion band, so it is the one thing in the rail
        // that never inverts. Everything else reads fine either way; the primary
        // CTA needs to stay cream, or it drops to a dark brown on the dark
        // sections and stops looking like the loudest thing in the rail.
        position: 'relative',
        zIndex: 6,
        display: 'block',
        padding: px(s[4], s[5]),
        background: c.accent,
        color: c.ink,
        borderTop: `${rule.base}px solid ${c.ink}`,
        ...label(12, 700, 0.14),
        textDecoration: 'none',
        textAlign: 'center',
      }}
    >
      WORK WITH ME →
    </a>

    {/*
      The inversion surface. `usePortfolioMotion` fills this with one band per
      dark section, each sized to the overlap between that section and the rail,
      and each running `backdrop-filter: invert(1) hue-rotate(180deg)`. The
      hue-rotate is load-bearing: a plain invert (or mix-blend-mode: difference)
      swings every warm hue 180 degrees, turning the cream navy and the gold
      cornflower blue. Inverting lightness and rotating the hue back keeps the
      palette intact and lets the seam ride the real section edge.
    */}
    <div
      data-rail-invert="1"
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}
    />
  </aside>
);

export default Rail;
