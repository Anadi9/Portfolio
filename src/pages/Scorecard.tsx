import { useEffect, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { PixelIcon } from '@/components/brand/Bit';
import { PaperPage, SiteHeader } from '@/components/site/kit';
import { EXPECTED_HEADERS } from '@/lib/scorecard/headers';
import { asSummary, cardState, type ScorecardSummary } from '@/lib/scorecard/summary';
import '@/styles/home.css';

/**
 * `/scorecard`: we run our own checks on our own site, daily. The prerendered
 * page holds the static parts and an honest empty state; the client fills in
 * the latest run from `/api/scorecard`. No run, no numbers.
 */

const PATH = '/scorecard';
const TITLE = 'We audit ourselves: our own site’s scorecard · Anadi Thakur';
const DESCRIPTION =
  'The same checks we sell, run daily on anadithakur.in: search and AI visibility, security headers, and how we handle your data. Real results, dated, nothing staged.';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const NoScan = () => <p className="hq-small" style={{ margin: 0 }}>No scan yet. First scan runs after launch.</p>;

const List = ({ items, mark, label }: { items: string[]; mark: string; label: string }) =>
  items.length === 0 ? null : (
    <div style={{ display: 'grid', gap: 6 }}>
      <b style={{ font: '600 14px/1.3 var(--bq-font-body)' }}>{label}</b>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
        {items.map((i) => (
          <li key={i} className="hq-small" style={{ margin: 0 }}>
            <span aria-hidden>{mark}</span> {i}
          </li>
        ))}
      </ul>
    </div>
  );

const Card = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <article className="hq-card" aria-labelledby={id} style={{ padding: 24, display: 'grid', gap: 14, alignContent: 'start' }}>
    <h2 id={id} style={{ font: '600 20px/1.3 var(--bq-font-body)', margin: 0 }}>
      {title}
    </h2>
    {children}
  </article>
);

export default function Scorecard() {
  const [run, setRun] = useState<ScorecardSummary | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    fetch('/api/scorecard', { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRun(asSummary(j?.run)))
      .catch(() => {});
    return () => ctl.abort();
  }, []);

  const seo = cardState(run, 'readiness');
  const sec = cardState(run, 'headers');

  return (
    <>
      <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" />
      <PaperPage themeable header={<SiteHeader page="scorecard" themeToggle />}>
        <section className="hq-section" aria-labelledby="h-top" style={{ paddingTop: 56 }}>
          <div className="hq-wrap" style={{ display: 'grid', gap: 16 }}>
            <p className="hq-eyebrow" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <PixelIcon name="shield" size={27} /> We audit ourselves
            </p>
            <h1 id="h-top" className="bq-h1">
              Our own site, checked every day.
            </h1>
            <p className="hq-body" style={{ fontSize: 18, maxWidth: '52ch' }}>
              We run the same checks we sell on anadithakur.in and publish what they find, including what fails.
              {run ? ` Last scan: ${when(run.ranAt)}.` : ' No scan yet. First scan runs after launch.'}
            </p>
          </div>
        </section>

        <section className="hq-section" aria-label="Audit areas">
          <div className="hq-wrap hq-three">
            <Card id="h-seo" title="Search & AI visibility">
              {run?.readiness ? (
                <>
                  <p style={{ margin: 0, font: '400 40px/1 var(--bq-font-display)' }}>
                    {run.readiness.score}
                    <span className="hq-small"> / 100 AI readiness</span>
                  </p>
                  <List items={run.readiness.passed} mark="✓" label="Passing" />
                  <List items={run.readiness.warned} mark="!" label="Could be better" />
                  <List items={run.readiness.failed} mark="✕" label="Failing" />
                </>
              ) : seo.kind === 'missing' ? (
                <p className="hq-small" style={{ margin: 0 }}>{seo.reason}</p>
              ) : (
                <NoScan />
              )}
              <Link to="/ai-readiness" className="pf-underline hq-small">Run the same check on your site</Link>
            </Card>

            <Card id="h-sec" title="Reliability & security">
              {run?.headers ? (
                <>
                  <List items={run.headers.present} mark="✓" label="Security headers present" />
                  <List items={run.headers.missing} mark="✕" label="Missing" />
                </>
              ) : (
                <>
                  {sec.kind === 'missing' ? <p className="hq-small" style={{ margin: 0 }}>{sec.reason}</p> : <NoScan />}
                  <p className="hq-small" style={{ margin: 0 }}>
                    We check for: {EXPECTED_HEADERS.join(', ')}.
                  </p>
                </>
              )}
              <p className="hq-small" style={{ margin: 0 }}>
                <code>/api/health</code> reports whether the site’s backend is reachable.
              </p>
            </Card>

            <Card id="h-priv" title="Privacy & compliance">
              <ul className="hq-small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                <li>We collect only what you type into a form or Bit’s chat: name, email, your app link and answers.</li>
                <li>We keep it for 24 months after the last activity, then delete it.</li>
                <li>We delete it sooner if you ask.</li>
                <li>Your request appears on the public board only if you tick the box (off by default), and never with your name, email or URL.</li>
              </ul>
              <Link to="/privacy" className="pf-underline hq-small">Read the privacy page</Link>
            </Card>
          </div>
        </section>
      </PaperPage>
    </>
  );
}
