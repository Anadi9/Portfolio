import type { ReactNode } from 'react';
import { Bit, PixelIcon, type BitPose, type IconName } from '@/components/brand/Bit';
import { PaperPage, SiteHeader } from '@/components/site/kit';
import { trackRescue } from '@/lib/rescue/track';
import { Go } from './sections';
import '@/styles/home.css';

/**
 * One Bit's Quest service page (`/build-with-ai`, `/care`): hero, what's
 * included, packages, how it runs, FAQ and a closing CTA. Built on the
 * homepage's CSS-variable classes so it follows the same theme.
 */

export type ServicePageProps = {
  page: string;
  icon: IconName;
  pose: BitPose;
  eyebrow: string;
  title: ReactNode;
  lead: string;
  primary: { text: string; href: string };
  included: { title: string; items: [string, string][] };
  packages: { name: string; duration: string; price: string; detail: string }[];
  terms: string[];
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  closing: { title: string; body: string };
};

const track = (page: string, location: string) => () => trackRescue('cta_click', { page, location });

export function ServicePage(p: ServicePageProps) {
  return (
    <PaperPage header={<SiteHeader page={p.page} />}>
      <section className="hq-section" aria-labelledby="h-top" style={{ paddingTop: 56 }}>
        <div className="hq-wrap hq-split" style={{ alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <p className="hq-eyebrow" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <PixelIcon name={p.icon} size={27} /> {p.eyebrow}
            </p>
            <h1 id="h-top" className="bq-h1">
              {p.title}
            </h1>
            <p className="hq-body" style={{ fontSize: 18, maxWidth: '46ch' }}>
              {p.lead}
            </p>
            <div className="hq-btnrow">
              <Go href={p.primary.href} className="bq-btn" onClick={track(p.page, 'hero')}>
                <span aria-hidden>▶</span> {p.primary.text}
              </Go>
              <Go href="/?bit=1" className="bq-btn-ghost" onClick={track(p.page, 'hero-bit')}>
                Is this me? Ask Bit
              </Go>
            </div>
          </div>
          <div style={{ display: 'grid', justifyItems: 'center' }} aria-hidden>
            <Bit pose={p.pose} size={216} bob />
          </div>
        </div>
      </section>

      <section className="hq-section" aria-labelledby="h-inc">
        <div className="hq-wrap">
          <div className="hq-head">
            <h2 id="h-inc">{p.included.title}</h2>
          </div>
          <div className="hq-four">
            {p.included.items.map(([t, d]) => (
              <article key={t} className="hq-card" style={{ padding: 20, display: 'grid', gap: 8, alignContent: 'start' }}>
                <h3 style={{ font: '600 18px/1.3 var(--bq-font-body)', margin: 0 }}>{t}</h3>
                <p className="hq-small">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hq-section" aria-labelledby="h-price">
        <div className="hq-wrap">
          <div className="hq-head">
            <h2 id="h-price">Fixed prices.</h2>
            <p>
              Every quote is fixed before work starts.{' '}
              <a href="/#pricing" style={{ color: 'var(--bq-ink)', fontWeight: 600 }}>
                See all six packages →
              </a>
            </p>
          </div>
          <div className="hq-split" style={{ alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 16 }}>
              {p.packages.map((pk) => (
                <div key={pk.name} className="hq-pkg" style={{ boxShadow: 'var(--bq-shadow)', borderWidth: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <b style={{ fontSize: 18 }}>{pk.name}</b>
                    <span className="hq-small">{pk.duration}</span>
                  </div>
                  <span className="price" style={{ color: 'var(--bq-brand)' }}>
                    {pk.price}
                  </span>
                  <span className="hq-small">{pk.detail}</span>
                </div>
              ))}
            </div>
            <div className="hq-dark" style={{ padding: 22, display: 'grid', gap: 16 }}>
              <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>
                How you pay
              </span>
              <ul className="hq-check">
                {p.terms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <Go href={p.primary.href} className="bq-btn" onClick={track(p.page, 'price')}>
                <span aria-hidden>▶</span> {p.primary.text}
              </Go>
            </div>
          </div>
        </div>
      </section>

      <section className="hq-section" aria-labelledby="h-how">
        <div className="hq-wrap">
          <div className="hq-head">
            <h2 id="h-how">How it runs.</h2>
          </div>
          <ol className="hq-four" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {p.steps.map((st, i) => (
              <li key={st.title} className="hq-step">
                <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{st.title}</h3>
                <p className="hq-small">{st.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hq-section" aria-labelledby="h-faq">
        <div className="hq-wrap">
          <div className="hq-head">
            <h2 id="h-faq">Questions, answered.</h2>
          </div>
          <div className="hq-faq">
            {p.faq.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>{f.q}</span>
                  <span aria-hidden />
                </summary>
                <p className="hq-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="hq-section" aria-labelledby="h-final">
        <div className="hq-wrap">
          <div className="hq-dark" style={{ padding: 32, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
              <h2 id="h-final" style={{ font: '400 var(--bq-h2)/0.95 var(--bq-font-display)', margin: 0 }}>
                {p.closing.title}
              </h2>
              <p style={{ margin: 0, color: '#c9c9c9' }}>{p.closing.body}</p>
            </div>
            <div className="hq-btnrow">
              <Go href={p.primary.href} className="bq-btn" onClick={track(p.page, 'final')}>
                <span aria-hidden>▶</span> {p.primary.text}
              </Go>
              <Go href="/audit?type=app" className="bq-btn-ghost" onClick={track(p.page, 'final-first-bug')}>
                First bug free
              </Go>
            </div>
          </div>
        </div>
      </section>
    </PaperPage>
  );
}
