import { c, display, gutter, heading, label, mono, px, rule, s, sectionY, stretch } from './tokens';
import { site } from '@/data/portfolio';
import { ORIGIN } from '@/components/Seo';

const [emailUser, emailHost] = site.email.split('@');

const cells = [
  { kind: 'EMAIL', value: [emailUser, `@${emailHost}`], href: `mailto:${site.email}`, external: false },
  { kind: 'GITHUB', value: [site.githubHandle], href: site.github, external: true },
  { kind: 'LINKEDIN', value: [site.linkedinHandle], href: site.linkedin, external: true },
  { kind: 'RESUME', value: ['PDF ↓'], href: site.resume, external: true },
];

const HEAD = ["Let's build", 'something'];

/**
 * The way out to the client side of the domain. The portfolio is served from
 * portfolio.anadithakur.in and the offers live on anadithakur.in, so these are
 * plain absolute anchors, not router links: a `Link` would try to render the
 * offer inside the portfolio host, which `vercel.json` only 301s back out of.
 * Sorted by the problem the visitor arrives with rather than by product name.
 */
const doors = [
  {
    kind: 'MY AI-BUILT APP IS BROKEN',
    value: 'Built with Lovable, Bolt, Cursor or v0 and falling over in production. Free audit, fixed price.',
    to: `${ORIGIN}/`,
  },
  {
    kind: "I'M BUILDING AN AI FEATURE",
    value: 'Find out whether it is a real product or a wrapper. Free 13-question test, 3 minutes.',
    to: `${ORIGIN}/teardown`,
  },
];

/**
 * Closing panel: the ask, then four ways to reach me.
 *
 * Motion contract for `usePortfolioMotion`: `[data-contact-char]` letters cut up
 * out of their line masks and then answer the cursor magnetically,
 * `[data-contact-ghost]` drifts on scroll, and each `[data-contact-cell]` prints
 * in sideways, filling with ink on hover.
 */
const Contact = () => (
  <section
    id="contact"
    data-screen-label="Contact"
    style={{
      position: 'relative',
      overflow: 'hidden',
      containerType: 'inline-size',
      background: c.accent,
      borderTop: `${rule.edge}px solid ${c.ink}`,
      padding: px(sectionY.top, gutter, s[10]),
    }}
  >
    <span
      data-contact-ghost="1"
      aria-hidden
      style={{
        position: 'absolute',
        top: s[6],
        left: 0,
        zIndex: 0,
        whiteSpace: 'nowrap',
        fontFamily: display,
        fontWeight: 900,
        fontStretch: `${stretch.bleed}%`,
        fontSize: 'clamp(120px,22vw,300px)',
        lineHeight: 1,
        letterSpacing: '-.05em',
        textTransform: 'uppercase',
        color: 'transparent',
        WebkitTextStroke: `1px ${c.accentEdge}`,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Say hello · say hello · say hello ·
    </span>

    <div
      data-contact-head="1"
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)',
        gap: s[10],
        alignItems: 'end',
        paddingBottom: s[9],
      }}
    >
      <div>
        <h2
          data-contact-headline="1"
          aria-label={HEAD.join(' ')}
          style={{
            margin: 0,
            ...heading('d2', { stretch: stretch.bleed }),
            color: c.ink,
            textTransform: 'uppercase',
          }}
        >
          {HEAD.map((line) => (
            <span
              key={line}
              aria-hidden
              style={{ display: 'flex', overflow: 'hidden', paddingTop: '.12em', marginTop: '-.12em' }}
            >
              {line.split('').map((ch, i) => (
                <span
                  key={`${line}-${i}`}
                  data-contact-char="1"
                  style={{ display: 'block', width: ch === ' ' ? '.26em' : undefined, willChange: 'transform' }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </span>
          ))}
        </h2>
      </div>
      <p data-contact-copy="1" style={{ margin: `0 0 ${s[3]}px`, font: `400 16px/1.5 ${display}`, color: 'rgba(10,10,10,.78)', textWrap: 'pretty' }}>
        Fastest route is email; I answer within a day, usually with questions. If you&apos;d rather read code first,
        GitHub is right there.
      </p>
    </div>

    <nav
      aria-label="Hire me for"
      data-contact-doors="1"
      style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', borderTop: `${rule.base}px solid ${c.ink}` }}
    >
      {doors.map((door, i) => (
        <a
          key={door.to}
          href={door.to}
          data-contact-door="1"
          style={{
            display: 'grid',
            gap: s[3],
            padding: px(s[6], s[5]),
            borderRight: i === doors.length - 1 ? undefined : `${rule.base}px solid ${c.ink}`,
            textDecoration: 'none',
            color: c.ink,
          }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: s[4], ...label(12, 700, 0.14) }}>
            {door.kind}
            <span aria-hidden>→</span>
          </span>
          <span style={{ font: `400 15px/1.5 ${display}`, opacity: 0.78, maxWidth: '48ch', textWrap: 'pretty' }}>{door.value}</span>
        </a>
      ))}
    </nav>

    <div
      data-contact-links="1"
      style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: `${rule.base}px solid ${c.ink}` }}
    >
      {cells.map((cell, i) => (
        <a
          key={cell.kind}
          href={cell.href}
          data-contact-cell="1"
          {...(cell.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: px(s[6], s[5]),
            borderRight: i === cells.length - 1 ? undefined : `${rule.base}px solid ${c.ink}`,
            textDecoration: 'none',
            color: c.ink,
          }}
        >
          <span
            data-cell-fill="1"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: c.ink,
              transform: 'scaleY(0)',
              transformOrigin: 'bottom center',
              pointerEvents: 'none',
            }}
          />
          <span
            data-cell-arrow="1"
            aria-hidden
            style={{
              position: 'absolute',
              top: s[5],
              right: s[5],
              ...label(12, 700, 0),
              color: c.accent,
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            ↗
          </span>

          <span style={{ position: 'relative', zIndex: 1, display: 'block' }}>
            <span data-cell-kind="1" style={{ display: 'block', ...label(10, 500, 0.14), opacity: 0.65, marginBottom: s[3] }}>
              {cell.kind}
            </span>
            {/* Fluid, with a wrap fallback: the LinkedIn handle is 28 mono
                characters and was clipping against the cell's hidden overflow. */}
            <span
              data-cell-value="1"
              style={{
                display: 'block',
                font: `700 clamp(12px, 1.15cqw, 15px)/1.35 ${mono}`,
                overflowWrap: 'anywhere',
              }}
            >
              {cell.value.map((line) => (
                <span key={line} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </span>
          </span>
        </a>
      ))}
    </div>

    <div
      data-contact-foot="1"
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: s[4],
        flexWrap: 'wrap',
        padding: px(s[5], 0),
        borderTop: `${rule.base}px solid ${c.ink}`,
        ...label(10, 500, 0.12),
        color: 'rgba(10,10,10,.7)',
      }}
    >
      <span>© 2026 ANADI THAKUR</span>
      <span>BUILT FROM SCRATCH. NO TEMPLATE.</span>
    </div>
  </section>
);

export default Contact;
