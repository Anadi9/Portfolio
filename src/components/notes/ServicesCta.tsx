import { Link } from 'vite-react-ssg';
import { c, display, label, px, rule, s } from '@/components/brand/tokens';
import { trackRescue } from '@/lib/rescue/track';

/**
 * The close of a drop, wisdom or dispatch post: the audit's three areas as
 * three quiet doors (Bit's Quest positioning: one audit, three areas). Fix posts have `FixCta` instead, because their reader already
 * named the problem; here the reader came to learn something, so this offers
 * the free checks without assuming which one fits.
 *
 * Outlined on paper, not a dark plate, so it sits below the post's own closing
 * aside (the tradeoff, "nothing is gated") without competing with it.
 */
const AREAS = [
  { key: 'app', path: '/audit?type=app', title: 'Something breaking, or about to launch?', name: 'Reliability & security' },
  { key: 'ai', path: '/ai-visibility', title: 'Can Google and AI assistants find and recommend you?', name: 'Search & AI visibility' },
  { key: 'dpdp', path: '/dpdp', title: 'Consent, notices and data requests in order?', name: 'Privacy & compliance' },
] as const;

const ServicesCta = ({ slug }: { slug: string }) => (
  <aside aria-label="First bug free" style={{ marginTop: s[10], padding: s[8], border: `${rule.edge}px solid ${c.ink}`, background: '#fff', boxShadow: `6px 6px 0 ${c.ink}` }}>
    <p style={{ ...label(10), color: c.markOnPaper, margin: px(0, 0, s[3]) }}>Building an app? First bug free</p>
    <p style={{ margin: px(0, 0, s[6]), font: `400 16px/1.6 ${display}`, color: c.ink }}>
      Send your app link and Anadi finds its biggest risk, on video, for free. The audit checks three areas:
    </p>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
      {AREAS.map((sv) => (
        <li key={sv.key} style={{ borderBottom: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
          <Link
            to={sv.path}
            onClick={() => trackRescue('cta_click', { page: `note:${slug}`, location: 'services_cta', service: sv.key })}
            className="pf-underline"
            style={{ display: 'flex', justifyContent: 'space-between', gap: s[4], padding: px(s[4], 0), textDecoration: 'none', color: c.ink }}
          >
            <span style={{ font: `600 16px/1.4 ${display}` }}>{sv.title}</span>
            <span aria-hidden style={{ ...label(11), whiteSpace: 'nowrap' }}>
              {sv.name} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </aside>
);

export default ServicesCta;
