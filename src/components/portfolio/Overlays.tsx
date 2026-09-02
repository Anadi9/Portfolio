import { c, heading, label, stretch } from './tokens';

/**
 * There used to be one of these on every section boundary: journey, stack and
 * contact. Three full-bleed interruptions in a row read as noise rather than
 * punctuation, and they announced a heading you were about to read anyway. Only
 * the closing one survives, where it lands as a payoff instead of a toll gate.
 */
const wipes = [{ target: 'contact', bg: c.accent, fg: c.ink, lines: ['Say hello'] }];

/**
 * Paper tooth, as a data URI.
 *
 * `fractalNoise` at a high base frequency and desaturated to grey: under
 * `overlay` a mid-grey pixel leaves the surface untouched and only the
 * deviations read, which is what lets one tile sit over both the cream and the
 * ink without tinting either. `stitchTiles` keeps the 180px repeat from
 * showing its seams.
 *
 * Two corrections keep it from lifting the page a shade lighter instead of
 * texturing it, both aimed at landing the tile's mean on neutral grey, the
 * value `overlay` passes through untouched:
 *
 *   · the alpha channel is flattened to 1. feTurbulence randomises all four
 *     channels, and compositing half-transparent noise raises the mean rather
 *     than scattering around it.
 *   · `color-interpolation-filters` is forced to sRGB. Filters default to
 *     linearRGB, and converting that result back for display pulled the mean
 *     luma up to 187 of 255, a permanent wash over every surface on the page.
 *
 * It does not animate. Film grain crawls; paper grain doesn't, and this page is
 * pretending to be printed. It also means the topmost full-viewport layer on
 * the page repaints exactly never.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E\")";

/** Full-bleed section wipe, the paper grain, and the inverting square cursor. */
const Overlays = () => (
  <>
    {wipes.map((w) => (
      <div
        key={w.target}
        data-swipe={w.target}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          // Above the rail (60). At 55 the "full-bleed" wipe passed underneath
          // it and left a 264px stripe of the page showing, which read as a bug.
          zIndex: 70,
          background: w.bg,
          transform: 'translateY(100%)',
          pointerEvents: 'none',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          style={{
            ...heading('d1', { stretch: stretch.bleed, vw: true }),
            color: w.fg,
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {w.lines.map((line) => (
            <span key={line} style={{ display: 'block' }}>
              {line}
            </span>
          ))}
        </span>
      </div>
    ))}

    {/* Above the wipes (70) so the takeover is printed on the same stock as
        everything else, below the cursor (90) so the cursor stays crisp. */}
    <div
      data-grain="1"
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        pointerEvents: 'none',
        backgroundImage: GRAIN,
        backgroundSize: '180px 180px',
        mixBlendMode: 'overlay',
        opacity: 0.42,
      }}
    />

    <div
      data-cursor="1"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 90,
        width: 14,
        height: 14,
        background: '#fff',
        mixBlendMode: 'difference',
        pointerEvents: 'none',
        opacity: 0,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <span data-cursor-label="1" style={{ ...label(10, 700, 0.14), color: c.ink, opacity: 0, whiteSpace: 'nowrap' }}>
        VIEW ↗
      </span>
    </div>
  </>
);

export default Overlays;
