import { Link } from 'vite-react-ssg';
import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import { SERVICES } from '@/components/site/kit';
import { trackRescue } from '@/lib/rescue/track';

/**
 * The close of a drop, wisdom or dispatch post: the three services as three
 * quiet doors. Fix posts have `FixCta` instead, because their reader already
 * named the problem; here the reader came to learn something, so this offers
 * the free checks without assuming which one fits.
 *
 * Outlined on paper, not a dark plate, so it sits below the post's own closing
 * aside (the tradeoff, "nothing is gated") without competing with it.
 */
const ServicesCta = ({ slug }: { slug: string }) => (
  <aside aria-label="Free checks" style={{ marginTop: s[10], padding: s[8], border: `${rule.base}px solid ${c.ink}` }}>
    <p style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[3]) }}>RUN A BUSINESS? THREE FREE CHECKS</p>
    <p style={{ margin: px(0, 0, s[6]), font: `400 16px/1.6 ${display}`, color: c.ink }}>
      I check where you stand for free, using only what&apos;s public, and send a plain-English report in 48 hours.
    </p>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
      {SERVICES.map((sv) => (
        <li key={sv.key} style={{ borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
          <Link
            to={sv.path}
            onClick={() => trackRescue('cta_click', { page: `note:${slug}`, location: 'services_cta', service: sv.key })}
            className="pf-underline"
            style={{ display: 'flex', justifyContent: 'space-between', gap: s[4], padding: px(s[4], 0), textDecoration: 'none', color: c.ink }}
          >
            <span style={{ font: `600 16px/1.4 ${display}` }}>{sv.title}</span>
            <span aria-hidden style={{ ...label(11, 700, 0.12), whiteSpace: 'nowrap' }}>
              {sv.name.toUpperCase()} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </aside>
);

export default ServicesCta;
