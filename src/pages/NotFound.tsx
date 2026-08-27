import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';
import { c, display, heading, label, px, s, stretch } from '@/components/portfolio/tokens';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: c.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: s[7],
        padding: 'clamp(24px,6vw,80px)',
      }}
    >
      {/* Prerendered as `dist/404.html` by some hosts; noindex keeps a
          soft-404 out of the index either way. */}
      <Head>
        <title>Not found — Anadi Thakur</title>
        <meta name="robots" content="noindex" />
      </Head>

      <span style={{ ...label(11, 700, 0.16), color: c.mark }}>ERROR — 404</span>
      <h1
        style={{
          margin: 0,
          ...heading('d0', { stretch: stretch.bleed, vw: true }),
          color: c.accent,
          textTransform: 'uppercase',
        }}
      >
        Nothing
        <br />
        here
      </h1>
      <p style={{ margin: 0, maxWidth: 520, font: `400 16px/1.5 ${display}`, color: c.dimOnInk }}>
        <code style={{ color: '#fff' }}>{location.pathname}</code> isn&apos;t a page on this site. The work, the route
        and the contact details all live on the front page.
      </p>
      <a
        href="/"
        className="pf-nudge"
        style={{
          alignSelf: 'flex-start',
          padding: px(s[4], s[6]),
          background: c.accent,
          color: c.ink,
          ...label(11, 700, 0.12),
          textDecoration: 'none',
        }}
      >
        BACK TO THE PORTFOLIO →
      </a>
    </div>
  );
};

export default NotFound;
