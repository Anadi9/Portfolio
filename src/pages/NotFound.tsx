import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';
import { Bit } from '@/components/brand/Bit';
import { brandHeadTags } from '@/components/Seo';
import { c, display, label, s } from '@/components/brand/tokens';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="bq-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: s[6],
        padding: 'clamp(24px,6vw,80px)',
      }}
    >
      {/* Prerendered as `dist/404.html` by some hosts; noindex keeps a
          soft-404 out of the index either way. */}
      <Head>
        <title>Not found · Anadi Thakur</title>
        <meta name="robots" content="noindex" />
        {brandHeadTags()}
      </Head>

      <Bit pose="found" size={126} bob label="Bit, looking for a page that isn't here" />
      <span style={{ ...label(11), color: c.shell }}>Error · 404</span>
      <h1 className="bq-h1" style={{ fontSize: 'clamp(56px, 9vw, 120px)' }}>
        Bit looked everywhere.
      </h1>
      <p style={{ margin: 0, maxWidth: 520, font: `400 17px/1.5 ${display}`, color: c.dim }}>
        <code style={{ color: c.ink }}>{location.pathname}</code> isn&apos;t a page on this site. Your app can still be
        made production-ready, though.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4] }}>
        <a href="/" className="bq-btn">
          <span aria-hidden>▶</span> Back to home
        </a>
        <a href="/audit?type=app" className="bq-btn-ghost">
          Find my app&apos;s first bug — free
        </a>
      </div>
    </div>
  );
};

export default NotFound;
