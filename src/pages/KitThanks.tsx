import { useCallback, useEffect, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import KitShell from '@/components/kit/KitShell';
import { MailLink, PackDownload, UpgradeBox, type Offer } from '@/components/kit/Downloads';
import { body, eyebrow, hint, p } from '@/components/kit/styles';
import { c, display, gutter, heading, label, mono, px, s, sectionY } from '@/components/portfolio/tokens';
import type { PackId } from '@/data/kit';
import { KIT } from '@/lib/kit/product';

/**
 * `/kit/thanks?session_id=cs_…`: where Stripe sends a pack buyer after paying.
 *
 * The session id arrives in the query string, which the prerenderer never sees,
 * so it is read after mount and the static HTML is the loading state. The
 * server (`/api/kit/order`) asks Stripe about the session and reads the order
 * the webhook wrote. The webhook usually lands first; when it hasn't, this
 * polls for up to 30 seconds, then falls back to the email. Not indexed.
 */

type Ready = { status: 'ready'; token: string; packs: { id: PackId; name: string; version: string; bytes: number }[]; upgrade: Offer };
type State =
  | { status: 'loading' }
  | { status: 'pending'; tries: number }
  | { status: 'slow' }
  | Ready
  | { status: 'unpaid' | 'unknown' | 'refunded' | 'error' };

const POLL_MS = 2000;
const POLL_TRIES = 15;

export default function KitThanks() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async (tries: number) => {
    const id = new URLSearchParams(window.location.search).get('session_id');
    if (!id) return setState({ status: 'unknown' });
    try {
      const res = await fetch(`/api/kit/order?session_id=${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => ({}))) as Partial<Ready> & { status?: string };
      if (data.status === 'ready') return setState(data as Ready);
      if (data.status === 'pending') return setState(tries >= POLL_TRIES ? { status: 'slow' } : { status: 'pending', tries });
      if (data.status === 'unpaid' || data.status === 'unknown' || data.status === 'refunded') return setState({ status: data.status });
      setState({ status: 'error' });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  useEffect(() => {
    if (state.status !== 'pending') return;
    const t = setTimeout(() => load(state.tries + 1), POLL_MS);
    return () => clearTimeout(t);
  }, [state, load]);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <KitShell>
      <Seo title={`Thanks · ${KIT.name}`} description="Your download." path={KIT.packsThanksPath} type="website" robots="noindex, nofollow" />
      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <div style={{ display: 'grid', gap: s[7], maxWidth: 720 }}>
          <p style={eyebrow}>{state.status === 'ready' ? 'PAYMENT RECEIVED' : 'YOUR ORDER'}</p>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
            {state.status === 'ready' ? (
              <>
                Thanks. <span style={{ color: p.gold }}>Here’s your download.</span>
              </>
            ) : (
              'Thanks.'
            )}
          </h1>

          <div aria-live="polite" style={{ display: 'grid', gap: s[5] }}>
            {state.status === 'loading' && <p style={body}>Checking your payment…</p>}
            {state.status === 'pending' && <p style={body}>Preparing your download…</p>}
            {state.status === 'slow' && (
              <p style={body}>
                Your payment went through, and your download link is on its way to the email address you paid with. If it isn’t
                there in 10 minutes, check spam, then email <MailLink />.
              </p>
            )}
            {state.status === 'unpaid' && (
              <p style={body}>
                This payment hasn’t gone through yet. If your bank is still processing it, the link will arrive by email when it
                does. Questions: <MailLink />.
              </p>
            )}
            {state.status === 'refunded' && (
              <p style={body}>
                This order was refunded, so there’s nothing to download. If that’s wrong, email <MailLink />.
              </p>
            )}
            {state.status === 'unknown' && (
              <p style={body}>
                This link doesn’t match a purchase. If you’ve paid, your download link is in your email. If it isn’t, email{' '}
                <MailLink />.
              </p>
            )}
            {state.status === 'error' && (
              <p style={body}>
                Couldn’t check your order just now. Refresh in a minute, or use the link in your email. Still stuck? <MailLink />.
              </p>
            )}
          </div>

          {state.status === 'ready' && (
            <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {state.packs.map((pk) => (
                  <PackDownload key={pk.id} token={state.token} id={pk.id} name={pk.name} versions={[{ version: pk.version, bytes: pk.bytes }]} />
                ))}
              </ul>
              <p style={{ ...body, fontSize: 15 }}>
                Your downloads page, with everything you’ve bought with this email:{' '}
                <a href={`${KIT.downloadsPath}/${state.token}`} style={{ color: p.ink, overflowWrap: 'anywhere' }}>
                  {origin}
                  {KIT.downloadsPath}/{state.token}
                </a>
                . The same link is in your email.
              </p>
              {state.upgrade && <UpgradeBox token={state.token} offer={state.upgrade} onGranted={() => window.location.assign(`${KIT.downloadsPath}/${state.token}`)} />}
              <div style={{ display: 'grid', gap: s[4], padding: px(s[7], s[7]), background: c.plate }}>
                <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>WHERE TO START</span>
                <p style={{ ...body, color: c.bright }}>
                  Unzip it and open <code style={{ font: `500 0.9em/1 ${mono}` }}>README.md</code>. It has the install steps for
                  your tool.
                </p>
              </div>
            </>
          )}

          <p style={{ ...hint, font: `400 15px/1.55 ${display}` }}>
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
