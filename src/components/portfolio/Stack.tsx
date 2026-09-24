import { c, display, gutter, heading, label, mono, px, rule, s, sectionY } from './tokens';
import { stack } from '@/data/portfolio';

const HEAD = ['The stack,', 'honestly rated'];

/**
 * Four-column honest rating of the toolkit.
 *
 * Motion contract for `usePortfolioMotion`: the heading rides in `[data-stack-line]`
 * masks, the top rule draws on `[data-stack-rule]`, and each `[data-stack-col]`
 * prints downward carrying its meter, percentage and item rows. Hover sweeps
 * `[data-stack-fill]` up from the baseline and inverts the column.
 */
const Stack = () => (
  <section
    id="stack"
    data-dark="1"
    data-screen-label="Stack"
    style={{
      containerType: 'inline-size',
      background: c.ink,
      borderTop: `${rule.edge}px solid ${c.ink}`,
      padding: px(sectionY.top, gutter, sectionY.bottom),
      color: '#fff',
    }}
  >
    <div
      data-stack-head="1"
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: s[11], alignItems: 'end', marginBottom: s[9] }}
    >
      <div>
        <div
          data-stack-badge="1"
          style={{
            display: 'inline-block',
            padding: px(s[1], s[3]),
            border: `${rule.hair}px solid ${c.ruleSoft}`,
            ...label(10, 700, 0.16),
            color: c.mark,
            marginBottom: s[5],
          }}
        >
          TWENTY THINGS, RANKED
        </div>
        <h2 style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase' }}>
          {HEAD.map((line) => (
            <span key={line} style={{ display: 'block', overflow: 'hidden', paddingTop: '.12em', marginTop: '-.12em' }}>
              <span data-stack-line="1" style={{ display: 'block' }}>
                {line}
              </span>
            </span>
          ))}
        </h2>
      </div>
      <p data-stack-copy="1" style={{ margin: `0 0 ${s[1]}px`, font: `400 15px/1.5 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>
        Daily means I&apos;d take a ticket on it tomorrow. Working means I&apos;d need an afternoon and the docs. No one
        is fluent in twenty things.
      </p>
    </div>

    <div
      data-stack-rule="1"
      aria-hidden
      style={{ height: rule.base, background: c.rule, transformOrigin: 'left center' }}
    />

    <div
      data-stack-grid="1"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderLeft: `${rule.base}px solid ${c.rule}` }}
    >
      {stack.map((col) => (
        <div
          key={col.heading}
          data-stack-col="1"
          data-strong={col.strong ? '1' : '0'}
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: s[5],
            borderRight: `${rule.base}px solid ${c.rule}`,
            borderBottom: `${rule.base}px solid ${c.rule}`,
          }}
        >
          <span
            data-stack-fill="1"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: col.strong ? c.accent : c.bright,
              transform: 'scaleY(0)',
              transformOrigin: 'bottom center',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div data-stack-heading="1" style={{ ...label(10, 700, 0.16), color: col.strong ? c.mark : c.dim, marginBottom: s[4] }}>
              {col.heading}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: s[3], marginBottom: s[5] }}>
              <span data-stack-track="1" style={{ position: 'relative', flex: 1, height: rule.edge, background: c.rule, display: 'block' }}>
                <span
                  data-stack-meter={col.level}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: col.strong ? c.mark : c.dimOnInk,
                    transform: `scaleX(${col.level})`,
                    transformOrigin: 'left center',
                    display: 'block',
                  }}
                />
              </span>
              <span
                data-stack-pct={col.level}
                style={{ ...label(10, 700, 0.06), color: col.strong ? c.bright : c.dim, minWidth: '4ch', textAlign: 'right' }}
              >
                {Math.round(col.level * 100)}%
              </span>
            </div>

            <div style={{ font: `500 13px/2 ${mono}` }}>
              {col.items.map((item) => (
                <span key={item} style={{ display: 'block', overflow: 'hidden' }}>
                  <span data-stack-item="1" style={{ display: 'block', color: col.strong ? c.bright : c.dimOnInk }}>
                    {item}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Stack;
