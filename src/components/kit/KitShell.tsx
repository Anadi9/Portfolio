import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site/kit';
import { c, gutter, label, px, rule, s } from '@/components/brand/tokens';
import { p } from './styles';

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


export default function KitShell({ children }: { children: ReactNode }) {
  return (
    <div className="bq-page" style={{ color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteHeader page="kit" />

      <main style={{ flex: 1 }}>{children}</main>

      <SiteFooter />
    </div>
  );
}
