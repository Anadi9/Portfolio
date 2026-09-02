import { c, display, gutter, heading, label, px, rule, s, sectionY } from './tokens';
import { milestones } from '@/data/portfolio';

/**
 * Career timeline.
 *
 * The route line is *not* a hardcoded path; `usePortfolioMotion` measures the
 * cards and generates the curve so every bend lands on a card's inner edge.
 * The markup here only declares the slots: one `[data-node]` group per
 * milestone, plus the drawing head that rides the line as it draws.
 */
const Journey = () => (
  <section
    id="journey"
    data-screen-label="Timeline"
    style={{
      position: 'relative',
      containerType: 'inline-size',
      background: c.paper,
      borderTop: `${rule.edge}px solid ${c.ink}`,
      padding: px(sectionY.top, gutter, sectionY.bottom),
      overflow: 'hidden',
    }}
  >
    {/* No max-width on the block: the heading carries its own hard break, and
        capping the whole block at 660 made the ramp's d3 wrap it to three lines. */}
    <div data-reveal="1" style={{ marginBottom: s[10] }}>
      <div
        style={{
          display: 'inline-block',
          padding: px(s[1], s[3]),
          background: c.ink,
          ...label(10, 700, 0.16),
          color: '#fff',
          marginBottom: s[6],
        }}
      >
        THE ROUTE HERE
      </div>
      <h2 style={{ margin: 0, ...heading('d3'), color: c.ink, textTransform: 'uppercase' }}>
        Six years,
        <br />
        no straight line
      </h2>
      <p style={{ margin: `${s[6]}px 0 0`, maxWidth: 660, font: `400 17px/1.5 ${display}`, color: '#4a4a4a', textWrap: 'pretty' }}>
        Intern to independent, with a detour through enterprise. Scroll: the line draws itself.
      </p>
    </div>

    <div data-timeline="1" style={{ position: 'relative', maxWidth: 1080, margin: '0 auto' }}>
      <svg
        data-path-svg="1"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 2,
        }}
        aria-hidden
      >
        {/* the route ahead, faint; the ink line draws over it */}
        <path data-path-track="1" fill="none" stroke={c.ink} strokeOpacity={0.14} strokeWidth={1} strokeDasharray="2 7" />

        <path
          data-path="1"
          fill="none"
          stroke={c.ink}
          strokeWidth={1.4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />

        {milestones.map((m, i) => (
          <g key={m.year} data-node={i} style={{ opacity: 0 }}>
            <line
              data-node-stub="1"
              x1={0}
              y1={0}
              x2={0}
              y2={0}
              stroke={c.ink}
              strokeWidth={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              pathLength={1}
            />
            <rect data-node-mark="1" x={-5} y={-5} width={10} height={10} fill={c.paper} stroke={c.ink} strokeWidth={2} />
          </g>
        ))}

        {/* the pen: rides the tip of the line while it draws */}
        <g data-path-head="1" style={{ opacity: 0 }}>
          <rect x={-11} y={-11} width={22} height={22} fill="none" stroke={c.markOnPaper} strokeWidth={1} strokeOpacity={0.55} />
          <rect x={-5} y={-5} width={10} height={10} fill={c.mark} stroke={c.ink} strokeWidth={2} />
        </g>
      </svg>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: s[8] }}>
        {milestones.map((m, i) => {
          const onInk = m.tone === 'ink';
          const onAccent = m.tone === 'accent';
          const left = i % 2 === 0;
          return (
            <div
              key={m.year}
              data-mile={i}
              data-side={left ? 'left' : 'right'}
              data-mile-shadow={onInk ? c.mark : c.ink}
              data-year="1"
              style={{
                position: 'relative',
                overflow: 'hidden',
                alignSelf: left ? 'flex-start' : 'flex-end',
                width: 'min(46%,440px)',
                background: onInk ? c.ink : onAccent ? c.accent : c.paper,
                border: `${rule.base}px solid ${c.ink}`,
                padding: px(s[6], s[6]),
                color: onInk ? '#fff' : c.ink,
                willChange: 'transform',
              }}
            >
              {/* print pass: sweeps across the card as it lands */}
              <div
                data-mile-flash="1"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: onInk ? c.mark : c.ink,
                  transform: 'scaleX(0)',
                  transformOrigin: left ? 'right center' : 'left center',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />

              <div style={{ overflow: 'hidden' }}>
                <div
                  data-mile-line="1"
                  data-yearnum={m.year}
                  style={{ ...heading('d5'), color: onInk ? c.mark : onAccent ? c.ink : c.markOnPaper }}
                >
                  &apos;{m.year}
                </div>
              </div>

              <div style={{ overflow: 'hidden', marginTop: s[2] }}>
                <h3 data-mile-line="1" style={{ margin: 0, ...heading('d7', { weight: 800 }) }}>
                  {m.title}
                </h3>
              </div>

              <div style={{ overflow: 'hidden' }}>
                <p
                  data-mile-line="1"
                  style={{
                    margin: `${s[2]}px 0 0`,
                    font: `400 14px/1.5 ${display}`,
                    color: onInk ? c.dimOnInk : onAccent ? 'rgba(10,10,10,.75)' : '#4a4a4a',
                  }}
                >
                  {m.body}
                </p>
              </div>

              <div
                data-mile-line="1"
                style={{
                  marginTop: s[4],
                  paddingTop: s[3],
                  borderTop: `${rule.hair}px solid ${onInk ? 'rgba(255,255,255,.2)' : onAccent ? 'rgba(10,10,10,.35)' : 'rgba(10,10,10,.18)'}`,
                  ...label(10, 500, 0.12),
                  // The status hue only ever appears on an availability claim,
                  // and here that is the '26 card's AVAILABLE NOW.
                  color: m.status
                    ? onInk
                      ? c.signalOnInk
                      : c.signal
                    : onInk
                      ? '#8a8a8a'
                      : onAccent
                        ? 'rgba(10,10,10,.7)'
                        : c.dim,
                  fontWeight: m.status ? 700 : undefined,
                }}
              >
                {m.status && (
                  <span
                    data-status-dot="1"
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      marginRight: s[2],
                      verticalAlign: 'baseline',
                      background: onInk ? c.signalOnInk : c.signal,
                      animation: 'pf-blink 1.6s steps(1,end) infinite',
                    }}
                  />
                )}
                {m.meta}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default Journey;
