import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import KitShell from '@/components/kit/KitShell';
import { MailLink, PackDownload, UpgradeBox, type Offer } from '@/components/kit/Downloads';
import { body, eyebrow, hint, p } from '@/components/kit/styles';
import { display, gutter, heading, px, s, sectionY } from '@/components/portfolio/tokens';
import type { PackId } from '@/data/kit';
import { KIT } from '@/lib/kit/product';

/**
 * `/kit/downloads/<token>`: everything a buyer's email owns, newest version
 * first. The link from the delivery email; the token is the credential.
 *
 * One prerendered shell (`/kit/downloads/_`) serves every token through a
 * `vercel.json` rewrite, and the list is fetched after mount from
 * `/api/kit/library`. Each button goes through `/api/kit/download`, which checks
 * ownership again and hands out a storage link valid for 60 seconds.
 * `vercel.json` sends `Referrer-Policy: no-referrer` and `noindex` for `/kit/*`,
 * so the token doesn't leak to other sites or into search.
 */

type Library = {
  email: string;
  packs: { id: PackId; name: string; versions: { version: string; bytes: number }[] }[];
  upgrade: Offer;
};
type State = { kind: 'loading' } | { kind: 'ready'; library: Library } | { kind: 'invalid' | 'limited' | 'error' };

export default function KitDownloads() {
  const { token = '' } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`/api/kit/library?token=${encodeURIComponent(token)}`);
      if (res.status === 400 || res.status === 404) return setState({ kind: 'invalid' });
      if (res.status === 429) return setState({ kind: 'limited' });
      if (!res.ok) return setState({ kind: 'error' });
      setState({ kind: 'ready', library: (await res.json()) as Library });
    } catch {
      setState({ kind: 'error' });
    }
  }, [token]);

  useEffect(() => {
    if (token && token !== '_') load();
  }, [token, load]);

  return (
    <KitShell>
      <Seo title={`Your downloads · ${KIT.name}`} description="Your downloads." path={KIT.downloadsPath} type="website" robots="noindex, nofollow" />
      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <div style={{ display: 'grid', gap: s[7], maxWidth: 720 }}>
          <p style={eyebrow}>{state.kind === 'ready' ? `BOUGHT WITH ${state.library.email.toUpperCase()}` : 'YOUR DOWNLOADS'}</p>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>Your downloads.</h1>

          <div aria-live="polite">
            {state.kind === 'loading' && <p style={body}>Loading your downloads…</p>}
            {state.kind === 'invalid' && (
              <p style={body}>
                This download link isn’t valid. Use the link from your purchase email, or email <MailLink />.
              </p>
            )}
            {state.kind === 'limited' && <p style={body}>Too many requests in a short time. Try again in a few minutes.</p>}
            {state.kind === 'error' && (
              <p style={body}>
                Couldn’t load your downloads just now. Refresh in a minute. Still stuck? <MailLink />.
              </p>
            )}
            {state.kind === 'ready' && state.library.packs.length === 0 && (
              <p style={body}>
                Nothing to download on this link. If that’s wrong, email <MailLink />.
              </p>
            )}
          </div>

          {state.kind === 'ready' && state.library.packs.length > 0 && (
            <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {state.library.packs.map((pk) => (
                  <PackDownload key={pk.id} token={token} id={pk.id} name={pk.name} versions={pk.versions} />
                ))}
              </ul>
              <p style={hint}>Keep this page’s link. If I publish a new version of something you own, it shows up here.</p>
              {state.library.upgrade && <UpgradeBox token={token} offer={state.library.upgrade} onGranted={load} />}
            </>
          )}

          <p style={{ ...hint, font: `400 15px/1.55 ${display}` }}>
            Unzip and start with README.md. Stuck? Reply to your delivery email. Rather have it done for you?{' '}
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
