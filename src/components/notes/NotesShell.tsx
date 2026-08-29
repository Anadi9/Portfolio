import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { MEASURE } from './prose';
import { BYLINE } from '@/components/Seo';
import { NextUp } from './OnRamp';
import { relatedTo } from '@/content';
import type { Post } from '@/data/notes';

/**
 * The chrome every notes route sits in.
 *
 * Deliberately not the portfolio `Rail`. Someone arriving here from a search
 * result wants the page they clicked, and a 264px column of stats, a client
 * ticker and a HIRE ME button is an interruption before the first sentence.
 * One bar, one way back, then the document.
 *
 * `post` is the article this chrome is wrapping, and its only job is READ NEXT.
 * Putting it here rather than in the three stream layouts means every post gets
 * a way onward by construction — a layout added later can't quietly ship
 * without one — and the index, which passes no post, simply doesn't render it.
 */
const NotesShell = ({ children, post }: { children: ReactNode; post?: Post }) => (
  <div
    style={{
      background: c.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      // The rail's sticky offset and every anchored heading's scroll-margin
      // measure against this, so the one number lives in one place.
      ['--pf-header-h' as string]: '60px',
    }}
  >
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: s[4],
        padding: px(s[4], 0),
        paddingLeft: 'clamp(20px, 5vw, 40px)',
        paddingRight: 'clamp(20px, 5vw, 40px)',
        borderBottom: `${rule.edge}px solid ${c.ink}`,
        position: 'sticky',
        top: 0,
        background: c.paper,
        zIndex: 10,
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
        <span
          style={{ width: 22, height: 22, background: c.accent, border: `${rule.hair}px solid ${c.ink}`, display: 'block' }}
        />
        <span style={{ ...label(11, 700, 0.12), color: c.ink }}>ANADI THAKUR</span>
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: s[5] }}>
        <Link to="/notes" style={{ ...label(11, 700, 0.14), color: c.ink, textDecoration: 'none' }}>
          NOTES
        </Link>
        <Link to="/#work" style={{ ...label(11, 700, 0.14), color: c.dim, textDecoration: 'none' }}>
          WORK
        </Link>
      </nav>
    </header>

    <main style={{ flex: 1 }}>{children}</main>

    {post && <NextUp posts={relatedTo(post)} />}

    <footer
      style={{
        borderTop: `${rule.edge}px solid ${c.ink}`,
        padding: px(s[9], 0),
        paddingLeft: 'clamp(20px, 5vw, 40px)',
        paddingRight: 'clamp(20px, 5vw, 40px)',
        background: c.ink,
      }}
    >
      <div style={{ maxWidth: MEASURE, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: s[4], justifyContent: 'space-between' }}>
        <span style={{ ...label(10, 500, 0.14), color: c.dimOnInk }}>NOTES — {BYLINE}</span>
        <Link to="/" style={{ ...label(10, 700, 0.14), color: c.mark, textDecoration: 'none' }}>
          BACK TO THE PORTFOLIO →
        </Link>
      </div>
    </footer>
  </div>
);

/**
 * The reading column used by all three stream layouts.
 *
 * `wide` is for the index, and only for the index. A post is prose and wants
 * the 760px measure; the feed is a two-column card with an OG thumbnail beside
 * it, and at 760 the headline gets about 320px to itself, which turns every
 * title into five lines of display type. Same gutters, same centring — one
 * number changes.
 */
export const Column = ({
  children,
  rail,
  wide,
}: {
  children: ReactNode;
  rail?: ReactNode;
  wide?: boolean;
}) => (
  <div
    className={['pf-frame', wide && 'pf-frame--wide', rail && 'pf-frame--railed']
      .filter(Boolean)
      .join(' ')}
  >
    {rail}
    <div className="pf-content">{children}</div>
  </div>
);

/** Mono meta line — `USE WHEN`, datelines, verification stamps. */
export const MetaLine = ({ tag, children }: { tag: string; children: ReactNode }) => (
  <p style={{ margin: px(0, 0, s[3]), font: `500 12px/1.5 ${mono}`, letterSpacing: '0.04em', color: c.dim }}>
    <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper, marginRight: s[3] }}>{tag}</span>
    {children}
  </p>
);

export const Standfirst = ({ children }: { children: ReactNode }) => (
  <p style={{ margin: px(s[6], 0, 0), font: `400 20px/1.5 ${display}`, color: '#3a3a3a' }}>{children}</p>
);

export default NotesShell;
