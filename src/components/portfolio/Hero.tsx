import portrait from '@/assets/portrait.webp';
import { c, display, gutter, heading, label, px, rule, s, stretch } from './tokens';
import { site, strengths } from '@/data/portfolio';
import { ORIGIN } from '@/components/Seo';

const NAME = ['ANADI', 'THAKUR'];

const barLink: React.CSSProperties = {
  ...label(12, 700, 0.12),
  color: c.ink,
  textDecoration: 'none',
};

/** Full-bleed hero: portrait wipe, outlined name, and the position dossier. */
const Hero = () => (
  <section
    id="home"
    data-screen-label="Hero"
    style={{
      position: 'relative',
      containerType: 'inline-size',
      background: c.accent,
      borderBottom: `${rule.edge}px solid ${c.ink}`,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
    }}
  >
    <div
      data-hpad="1"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: px(s[4], gutter),
        borderBottom: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <span style={{ ...label(11, 700, 0.16), color: c.ink }}>PORTFOLIO · 2026 EDITION</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: s[2], ...label(11, 500, 0.12), color: c.ink }}>
        {/* Status hue, first of four uses. See the `signal` note in tokens. */}
        <span
          data-status-dot="1"
          style={{ width: 8, height: 8, background: c.signal, display: 'block', animation: 'pf-blink 1.6s steps(1,end) infinite' }}
        />
        TAKING PROJECTS · IST, OVERLAPS US MORNINGS
      </span>
    </div>

    <div data-hero-visual="1" style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div data-hero-portrait="1" style={{ position: 'absolute', inset: 0, zIndex: 0, willChange: 'transform, clip-path' }}>
        <img
          src={portrait}
          alt="Anadi Thakur"
          // LCP element, and it is what the loader uncovers. React 18's DOM
          // doesn't know the camelCase form, so it goes through lowercase.
          {...({ fetchpriority: 'high' } as Record<string, string>)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            display: 'block',
            pointerEvents: 'none',
            filter: 'grayscale(1) contrast(1.15) brightness(.82)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg,rgba(10,10,10,.08) 0%,rgba(10,10,10,.55) 58%,rgba(10,10,10,.93) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          data-portrait-flood="1"
          style={{ position: 'absolute', inset: 0, background: c.accent, mixBlendMode: 'color', pointerEvents: 'none', opacity: 0 }}
        />
      </div>

      {/* The only h1 on the page. Set per-character for the cut-in, so the
          accessible name is declared here rather than spelled out letter by letter. */}
      <h1
        data-hero-name="1"
        aria-label={site.name}
        style={{
          position: 'absolute',
          left: gutter,
          right: gutter,
          bottom: s[12],
          zIndex: 2,
          margin: 0,
          ...heading('d1', { stretch: stretch.bleed }),
          color: 'transparent',
          WebkitTextStroke: '1.5px #fff',
          textTransform: 'uppercase',
          willChange: 'transform',
        }}
      >
        <span aria-hidden style={{ display: 'block' }}>
          {NAME.map((line) => (
            <span
              key={line}
              data-hline="1"
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                overflow: 'hidden',
                paddingTop: '.1em',
                marginTop: '-.1em',
              }}
            >
              {line.split('').map((ch, i) => (
                <span key={`${line}-${i}`} data-hchar="1" style={{ display: 'block' }}>
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </span>
      </h1>

      <div data-hoffset="1" style={{ position: 'absolute', left: gutter, bottom: gutter, zIndex: 2, ...label(12, 700, 0.14), color: '#fff' }}>
        ↳ {site.role.toUpperCase()}
      </div>

      <div
        aria-hidden
        data-hero-badge="1"
        style={{
          position: 'absolute',
          top: s[6],
          right: s[6],
          width: 78,
          height: 78,
          borderRadius: '50%',
          border: `${rule.hair}px dashed ${c.signalOnInk}`,
          // Deep enough for the on-ink status green to actually read: the
          // badge floats over the bright part of the portrait, and at .45 the
          // disc came out mid-grey and took the green down with it.
          background: 'rgba(10,10,10,.72)',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          zIndex: 2,
          animation: 'pf-spin 16s linear infinite',
        }}
      >
        <span style={{ ...label(10, 700, 0.05), lineHeight: 1.2, color: c.signalOnInk, textTransform: 'uppercase' }}>
          Open
          <br />
          For
          <br />
          Work
        </span>
      </div>
    </div>

    <div data-hero-info="1" style={{ position: 'relative', zIndex: 3, background: c.accent }}>
      <div
        data-hpad="1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: px(s[3], gutter),
          borderTop: `${rule.base}px solid ${c.ink}`,
          borderBottom: `${rule.base}px solid ${c.ink}`,
        }}
      >
        <div style={{ display: 'flex', gap: s[7] }}>
          <a href="#work" className="pf-underline" style={barLink}>WORK</a>
          <a href="#journey" className="pf-underline" style={barLink}>ROUTE</a>
          <a href="#stack" className="pf-underline" style={barLink}>STACK</a>
        </div>
        <div style={{ display: 'flex', gap: s[7] }}>
          <a href="#contact" className="pf-underline" style={barLink}>CONTACT</a>
          <a href={`${ORIGIN}/`} className="pf-underline" style={barLink}>FIX MY APP ↗</a>
        </div>
      </div>

      <div data-hero-cols="1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.3fr) minmax(0,1fr)' }}>
        <div data-hpad="1" style={{ padding: px(s[4], gutter), borderRight: `${rule.base}px solid ${c.ink}` }}>
          <div style={{ ...label(10, 500, 0.14), color: 'rgba(10,10,10,.6)', marginBottom: s[3] }}>POSITION</div>
          <div style={{ ...heading('d7', { weight: 800 }), color: c.ink }}>
            I make AI-built apps
            <br />
            hold up in production.
          </div>
        </div>

        <div
          data-hpad="1"
          style={{
            padding: px(s[4], gutter),
            borderRight: `${rule.base}px solid ${c.ink}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: s[3],
          }}
        >
          <p style={{ margin: 0, font: `400 15px/1.42 ${display}`, color: c.ink, textWrap: 'pretty' }}>
            4+ years shipping production React and Node, ZEISS included. Now I take apps built with Lovable, Bolt,
            Cursor and v0 and fix what breaks: auth, data, deploys, speed.
          </p>
          <div style={{ display: 'flex', gap: s[3] }}>
            <a
              href="#work"
              className="pf-nudge"
              style={{ padding: px(s[3], s[5]), background: c.ink, color: '#fff', ...label(11, 700, 0.12), textDecoration: 'none' }}
            >
              SEE THE WORK ↓
            </a>
            <a
              href={`${ORIGIN}/rescue/audit`}
              className="pf-ghost"
              style={{
                padding: px(s[3], s[5]),
                background: 'transparent',
                border: `${rule.base}px solid ${c.ink}`,
                color: c.ink,
                ...label(11, 700, 0.12),
                textDecoration: 'none',
              }}
            >
              FREE AUDIT ↗
            </a>
          </div>
        </div>

        <div
          data-hpad="1"
          style={{
            padding: px(s[4], gutter),
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: s[2],
            alignContent: 'start',
            ...label(12, 600, 0.08),
            color: c.ink,
          }}
        >
          <div style={{ ...label(10, 500, 0.14), color: 'rgba(10,10,10,.6)', marginBottom: s[1] }}>WHAT I&apos;M GOOD FOR</div>
          {strengths.map((str) => (
            <div key={str} style={{ display: 'flex', alignItems: 'center', gap: s[2] }}>
              <span style={{ width: 6, height: 6, background: c.ink }} />
              {str}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div data-wipe="1" style={{ position: 'absolute', inset: 0, zIndex: 40, background: c.ink, transform: 'translateY(100%)', pointerEvents: 'none' }} />
  </section>
);

export default Hero;
