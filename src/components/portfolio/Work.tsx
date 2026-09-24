import { c, display, gutter, heading, label, mono, px, rule, s } from './tokens';
import { marqueeItems, projects, site } from '@/data/portfolio';

/** The one project with a long version attached. */
const featured = projects.find((p) => p.study);

const MARQUEE = `${marqueeItems.join(' ✱ ')} ✱ `;

const techTag: React.CSSProperties = {
  padding: px(s[1], s[3]),
  border: `${rule.hair}px solid ${c.ruleSoft}`,
  ...label(10, 500, 0.1),
  color: '#c9c9c9',
};

const plateStyle: React.CSSProperties = {
  flex: 'none',
  width: 'min(64vw,700px)',
  display: 'flex',
  flexDirection: 'column',
  border: `${rule.base}px solid ${c.rule}`,
  background: c.plate,
  textDecoration: 'none',
  color: '#fff',
  transition: 'border-color .3s',
};

/** Scrolling stack band that separates the hero from the work reel. */
export const Marquee = () => (
  <div style={{ background: c.ink, overflow: 'hidden', borderBottom: `${rule.edge}px solid ${c.ink}` }}>
    <div
      data-marquee="1"
      style={{
        display: 'flex',
        width: '200%',
        animation: 'pf-tick 30s linear infinite',
        ...label(13, 500, 0.18),
        color: '#fff',
        padding: px(s[4], 0),
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flex: 'none', width: '50%' }}>{MARQUEE}</span>
      <span style={{ flex: 'none', width: '50%' }}>{MARQUEE}</span>
    </div>
  </div>
);

/**
 * The long version of the featured project, printed under the reel.
 *
 * The reel sells three projects in four lines each, which is the right length
 * for two of them and far too short for the one I actually built end to end.
 * This is the part someone technical reads before deciding whether the reel was
 * marketing: the problem, the three decisions worth defending, what shipped,
 * and what it cost. Nothing here claims a metric; the numbers describe the
 * thing, not its performance.
 */
const CaseStudy = () => {
  if (!featured?.study) return null;
  const { study } = featured;
  const live = featured.href;

  return (
    <div
      data-case="1"
      data-hpad="1"
      style={{
        containerType: 'inline-size',
        borderTop: `${rule.edge}px solid ${c.rule}`,
        padding: px(s[11], gutter, s[12]),
      }}
    >
      <div
        data-reveal="1"
        data-case-head="1"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: s[10], alignItems: 'end' }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: px(s[1], s[3]),
              background: c.mark,
              ...label(10, 700, 0.16),
              color: c.ink,
              marginBottom: s[6],
            }}
          >
            CASE STUDY · {featured.index}
          </div>
          <h3 style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase' }}>
            {featured.title[0]}
            <br />
            {featured.title[1]}
          </h3>
        </div>

        <dl
          style={{
            margin: 0,
            display: 'grid',
            gap: s[3],
            paddingBottom: s[2],
            ...label(10, 500, 0.12),
            color: c.dimOnInk,
          }}
        >
          {/* PRODUCT first, and it earns the slot: the reel calls this Signal,
              the thing you land on calls itself ANTA Lead Radar. Naming the
              destination up here means the click-through isn't a surprise. */}
          {[
            ['PRODUCT', study.product],
            ['ROLE', study.role],
            ['SPAN', study.span],
            ['STACK', featured.tech.join(' · ')],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: s[4], borderTop: `${rule.hair}px solid ${c.rule}`, paddingTop: s[3] }}>
              {/* Wide enough for PRODUCT, the longest key, at this tracking. */}
              <dt style={{ flex: 'none', width: 64, color: c.mark }}>{k}</dt>
              <dd style={{ margin: 0, color: c.bright, textTransform: 'uppercase' }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* The problem, at standfirst size: the only long-form line in the block. */}
      <p
        data-reveal="1"
        style={{
          margin: `${s[10]}px 0 0`,
          maxWidth: 940,
          ...heading('d7', { weight: 800 }),
          color: '#fff',
          textWrap: 'pretty',
        }}
      >
        {study.problem}
      </p>

      <div
        data-reveal="1"
        data-case-moves="1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          marginTop: s[10],
          borderTop: `${rule.base}px solid ${c.rule}`,
          borderLeft: `${rule.base}px solid ${c.rule}`,
        }}
      >
        {study.moves.map((m) => (
          <article
            key={m.n}
            style={{
              padding: px(s[6], s[6], s[8]),
              borderRight: `${rule.base}px solid ${c.rule}`,
              borderBottom: `${rule.base}px solid ${c.rule}`,
            }}
          >
            <div style={{ ...heading('d6'), color: c.mark }}>{m.n}</div>
            <h4 style={{ margin: `${s[4]}px 0 ${s[3]}px`, font: `800 17px/1.25 ${display}`, color: '#fff' }}>{m.head}</h4>
            <p style={{ margin: 0, font: `400 14px/1.6 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>{m.body}</p>
          </article>
        ))}
      </div>

      <div
        data-reveal="1"
        data-case-results="1"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: s[8], marginTop: s[9] }}
      >
        {study.results.map((r) => (
          <div key={r.unit} style={{ borderTop: `${rule.edge}px solid ${c.accent}`, paddingTop: s[4] }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: s[3] }}>
              <span style={{ ...heading('d5'), color: '#fff' }}>{r.value}</span>
              <span style={{ ...label(10, 700, 0.14), color: c.mark }}>{r.unit}</span>
            </div>
            <p style={{ margin: `${s[3]}px 0 0`, font: `400 13px/1.5 ${display}`, color: c.dimOnInk }}>{r.note}</p>
          </div>
        ))}
      </div>

      <div
        data-reveal="1"
        data-case-foot="1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[7],
          flexWrap: 'wrap',
          marginTop: s[9],
          paddingTop: s[6],
          borderTop: `${rule.hair}px solid ${c.rule}`,
        }}
      >
        <p style={{ margin: 0, maxWidth: 620, font: `400 14px/1.6 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>
          <span style={{ ...label(10, 700, 0.14), color: c.mark, marginRight: s[3] }}>THE TRADE</span>
          {study.tradeoff}
        </p>

        {live ? (
          <a
            href={live}
            target="_blank"
            rel="noreferrer"
            className="pf-nudge pf-nudge-lg"
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: s[4],
              padding: px(s[4], s[6]),
              background: c.accent,
              color: c.ink,
              ...label(11, 700, 0.12),
              textDecoration: 'none',
            }}
          >
            OPEN {study.product.toUpperCase()}<span>↗</span>
          </a>
        ) : (
          /* No URL in `SIGNAL_HREF` yet. It renders as a dead plate rather than
             a live button, because a CTA that goes nowhere is worse than one
             that admits it isn't ready. */
          <span
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: s[3],
              padding: px(s[4], s[6]),
              border: `${rule.base}px dashed ${c.ruleSoft}`,
              font: `700 11px ${mono}`,
              letterSpacing: '.12em',
              color: c.dim,
            }}
          >
            LINK PENDING
          </span>
        )}
      </div>
    </div>
  );
};

/** Pinned horizontal reel of project plates plus the end card. */
const Work = () => (
  <section id="work" data-dark="1" data-screen-label="Selected work" style={{ background: c.ink, color: '#fff' }}>
    <div data-hpad="1" style={{ containerType: 'inline-size', padding: px(s[12], gutter, s[9]) }}>
      <div
        data-reveal="1"
        data-work-head="1"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: s[11], alignItems: 'end' }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: px(s[1], s[3]),
              border: `${rule.hair}px solid ${c.mark}`,
              ...label(10, 700, 0.16),
              color: c.mark,
              marginBottom: s[6],
            }}
          >
            SELECTED WORK
          </div>
          <h2 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
            Three things
            <br />
            worth showing
          </h2>
        </div>
        <p style={{ margin: `0 0 ${s[2]}px`, font: `400 16px/1.5 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>
          Everything else is on GitHub. These three cover the range: an AI product I built end to end, an
          enterprise platform with real constraints, and a realtime dashboard that had to not fall over.
        </p>
      </div>
    </div>

    <div data-hwrap="1" style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div
        data-htrack="1"
        data-hpad="1"
        style={{ display: 'flex', alignItems: 'stretch', gap: s[7], padding: px(0, gutter, s[11]), willChange: 'transform' }}
      >
        {projects.map((p) => {
          const linked = Boolean(p.href);
          const Tag = (linked ? 'a' : 'div') as 'a';
          return (
            <Tag
              key={p.index}
              data-plate="1"
              data-plate-cta={linked ? 'VIEW ↗' : 'IN BUILD'}
              {...(linked ? { href: p.href, target: '_blank', rel: 'noreferrer' } : {})}
              style={plateStyle}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: s[4],
                  padding: px(s[4], s[5]),
                  borderBottom: `${rule.base}px solid ${c.rule}`,
                }}
              >
                <span style={{ ...label(12, 700, 0.12), color: c.mark }}>
                  {p.index} · {p.kind}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: s[2] }}>
                  {p.tech.map((t) => (
                    <span key={t} style={techTag}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div
                data-shot="1"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  aspectRatio: '16 / 10',
                  background: 'repeating-linear-gradient(135deg,#141414 0 11px,#1c1c1c 11px 22px)',
                  display: 'grid',
                  placeItems: 'center',
                  borderBottom: `${rule.base}px solid ${c.rule}`,
                }}
              >
                {p.shot ? (
                  <img
                    src={p.shot}
                    alt={`${p.title.join(' ')} screenshot`}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ ...label(11, 500, 0.14), color: '#7a7a7a', border: `${rule.hair}px solid ${c.ruleSoft}`, padding: px(s[2], s[4]) }}>
                    {p.shotLabel}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: s[4], padding: px(s[6], s[5]) }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: s[5] }}>
                  <h3 style={{ margin: 0, ...heading('d5'), textTransform: 'uppercase' }}>
                    {p.title[0]}
                    <br />
                    {p.title[1]}
                  </h3>
                  <span
                    data-arrow="1"
                    style={{
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      width: 52,
                      height: 52,
                      border: `${rule.base}px solid ${c.mark}`,
                      color: c.mark,
                      fontSize: 20,
                      transition: 'all .25s',
                    }}
                  >
                    ↗
                  </span>
                </div>
                <p style={{ margin: 0, font: `400 15px/1.5 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>{p.blurb}</p>
              </div>
            </Tag>
          );
        })}

        <div
          data-endcard="1"
          style={{
            flex: 'none',
            width: 'min(42vw,440px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: s[7],
            border: `${rule.base}px solid ${c.accent}`,
            background: c.ink,
            padding: px(s[7], s[6]),
          }}
        >
          <div style={{ ...label(11, 700, 0.16), color: c.mark }}>END OF THE REEL</div>
          <div style={{ ...heading('d4'), textTransform: 'uppercase' }}>
            There's more,
            <br />
            it's just less
            <br />
            photogenic
          </div>
          <div style={{ display: 'grid', gap: s[3] }}>
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className="pf-nudge pf-nudge-lg"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: px(s[4], s[5]),
                background: c.accent,
                color: c.ink,
                ...label(11, 700, 0.12),
                textDecoration: 'none',
              }}
            >
              CODE ON GITHUB<span>↗</span>
            </a>
            <a
              href={site.resume}
              target="_blank"
              rel="noreferrer"
              className="pf-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: px(s[4], s[5]),
                border: `${rule.base}px solid ${c.ruleSoft}`,
                color: '#fff',
                ...label(11, 700, 0.12),
                textDecoration: 'none',
              }}
            >
              FULL RESUME<span>↓</span>
            </a>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: gutter, right: gutter, bottom: s[7], zIndex: 5, display: 'flex', alignItems: 'center', gap: s[5] }}>
        <span data-hcount="1" style={{ flex: 'none', ...label(11, 700, 0.14), color: '#fff' }}>
          01 / 0{projects.length + 1}
        </span>
        <div style={{ flex: 1, height: 3, background: c.rule }}>
          <div data-hbar="1" style={{ height: '100%', background: c.accent, transform: 'scaleX(0)', transformOrigin: 'left center' }} />
        </div>
        {/* The gesture changes with the layout: the wide reel advances on the
            page's scroll, the narrow one on a swipe, so the hint has to say
            whichever is true. CSS owns the swap, same as the breakpoint. */}
        <span style={{ flex: 'none', ...label(11, 500, 0.14), color: c.dim }}>
          <span data-hhint="wide">KEEP SCROLLING →</span>
          <span data-hhint="swipe" style={{ display: 'none' }}>
            SWIPE →
          </span>
        </span>
      </div>
    </div>

    <CaseStudy />
  </section>
);

export default Work;
