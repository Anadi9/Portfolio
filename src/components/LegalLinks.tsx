import { Link } from 'vite-react-ssg';
import { c, label, s } from '@/components/portfolio/tokens';
import { LEGAL_PATHS } from '@/data/legal';

/** The policy row under a dark footer. Stripe's reviewers look for these links. */
export default function LegalLinks() {
  const style = { ...label(10, 700, 0.12), color: c.dimOnInk };
  return (
    <nav aria-label="Policies" style={{ flexBasis: '100%', display: 'flex', gap: s[6], flexWrap: 'wrap' }}>
      <Link to={LEGAL_PATHS.support} className="pf-underline" style={style}>SUPPORT</Link>
      <Link to={LEGAL_PATHS.terms} className="pf-underline" style={style}>TERMS</Link>
      <Link to={LEGAL_PATHS.privacy} className="pf-underline" style={style}>PRIVACY</Link>
      <Link to={LEGAL_PATHS.refunds} className="pf-underline" style={style}>REFUNDS</Link>
    </nav>
  );
}
