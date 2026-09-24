import { useEffect, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import KitShell from '@/components/kit/KitShell';
import { body, cta, eyebrow, hint, p } from '@/components/kit/styles';
import { c, display, gutter, heading, label, mono, px, s, sectionY } from '@/components/portfolio/tokens';
import { KIT } from '@/lib/kit/product';

/**
 * `/products/production-kit/thanks`: where Stripe sends a buyer after payment.
 *
 * The session id arrives in the query string, which the prerenderer never sees,
 * so it is read after mount; the static HTML is the "no link" state. This page
 * does not check the payment itself: the download endpoint asks Stripe on every
 * request, so a hand-typed id gets a 403 there rather than a zip. Not indexed:
 * it is meaningless without the id.
 */
export default function ProductionKitThanks() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(new URLSearchParams(window.location.search).get('session_id'));
  }, []);

  const href = sessionId ? `/api/production-kit-download?session_id=${encodeURIComponent(sessionId)}` : null;

  return (
    <KitShell>
      <Seo title={`Thanks · ${KIT.name}`} description="Your download." path={KIT.thanksPath} type="website" robots="noindex, follow" />
      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <div style={{ display: 'grid', gap: s[7], maxWidth: 720 }}>
          <p style={eyebrow}>PAYMENT RECEIVED</p>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
            Thanks. <span style={{ color: p.gold }}>Here’s your kit.</span>
          </h1>

          {href ? (
            <div style={{ display: 'grid', gap: s[3], justifyItems: 'start' }}>
              <a href={href} className="pf-nudge pf-nudge-lg" style={cta}>
                DOWNLOAD THE KIT (.ZIP)<span aria-hidden>↓</span>
              </a>
              <p style={hint}>The same link is on its way to your inbox. It stays valid, and always serves the latest version.</p>
            </div>
          ) : (
            <p style={body}>
              Your download link is on its way to the email address you paid with. If it hasn’t arrived in a few minutes,
              check spam, then email{' '}
              <a href="mailto:anadithakur99@gmail.com?subject=The%20Production%20Kit" style={{ color: p.ink }}>
                anadithakur99@gmail.com
              </a>
              .
            </p>
          )}

          <div style={{ display: 'grid', gap: s[4], padding: px(s[7], s[7]), background: c.accent }}>
            <span style={{ ...label(10, 700, 0.16), color: p.body }}>WHERE TO START</span>
            <p style={{ ...body, color: p.ink }}>
              Unzip it and open <code style={{ font: `500 0.9em/1 ${mono}` }}>README.md</code>. It has the install steps for
              Claude Code, Cursor, Lovable and Bolt. Then run the RLS audit and the pre-deploy check on the app you already have.
            </p>
          </div>

          <p style={{ ...body, font: `400 15px/1.55 ${display}` }}>
            Stuck, or found something wrong? Reply to the delivery email. Rather have it done for you?{' '}
            <Link to="/rescue/audit" style={{ color: p.ink }}>
              Get a free audit
            </Link>
            .
          </p>
        </div>
      </section>
    </KitShell>
  );
}
