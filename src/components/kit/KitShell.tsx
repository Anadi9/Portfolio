import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { c, gutter, label, px, rule, s } from '@/components/brand/tokens';
import { p } from './styles';
import LegalLinks from '@/components/LegalLinks';
import { NavLogo } from '@/components/brand/BitUI';

/**
 * Header, footer and shared styles for the kit's two pages. Same paper ground,
 * header and `data-rescue-*` responsive hooks as `/scan` and `/audit?type=app`, so
 * moving between the free check, the kit and the audit reads as one site.
 */

export const Check = ({ color = p.gold, size = 14 }: { color?: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const GITHUB = 'https://github.com/Anadi9';
const LINKEDIN = 'https://www.linkedin.com/in/anadi-thakur-92163316b/';

export default function KitShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: c.paper, color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        data-rescue-header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[4], gutter),
          borderBottom: `${rule.edge}px solid ${p.rule}`,
        }}
      >
        <NavLogo />
        <Link to="/production-ready" className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink }}>
          ← PRODUCTION READINESS
        </Link>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer
        data-rescue-footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: s[6],
          padding: px(s[8], gutter, s[10]),
          background: c.ink,
          borderTop: `${rule.hair}px solid ${c.rule}`,
        }}
      >
        <span style={{ ...label(11, 700, 0.12), color: '#fff' }}>© 2026 ANADI THAKUR</span>
        <nav aria-label="Elsewhere" style={{ display: 'flex', gap: s[6], flexWrap: 'wrap' }}>
          <Link to="/production-ready" className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            PRODUCTION READINESS
          </Link>
          <Link to="/scan" className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            FREE SUPABASE CHECK
          </Link>
          <a href={GITHUB} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            GITHUB ↗
          </a>
          <a href={LINKEDIN} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            LINKEDIN ↗
          </a>
        </nav>
        <LegalLinks />
      </footer>
    </div>
  );
}
