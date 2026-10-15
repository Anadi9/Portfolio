import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { TerminalHead, type THFace } from '@/components/brand/BitHead';
import { scoreFace } from '@/components/brand/BitUI';
import { c, display, heading, label, mono, px, rule, s } from '@/components/brand/tokens';
import { FaqSection, PaperPage, SectionHead, SiteHeader, TrustLine, body, cta, ctaClick, lead, p, section, split } from '@/components/site/kit';
import type { Report, Status } from '@/lib/readiness/analyze';
import { checkUrl } from '@/lib/readiness/url';
import { breadcrumbs, faqPage, graph, type Faq } from '@/lib/schema';

/**
 * `/ai-readiness`: the free AI Readiness Checker. Paste a URL, get a score and
 * the three fixes that matter most, in about ten seconds. It reads the site the
 * way a crawler that doesn't run JavaScript does, which is how most AI
 * crawlers read it, and ends at the AI Visibility audit with the URL carried
 * over.
 *
 * The intro and the explanation of each check are prerendered, so the page is
 * worth finding on its own; only the result is client-side.
 */

const PAGE = 'ai_readiness';
const PATH = '/ai-readiness';
const TITLE = 'AI Readiness Checker: Can ChatGPT Read Your Site?';
const DESCRIPTION =
  'Free tool: paste your URL and see in seconds whether ChatGPT, Perplexity and Gemini can read your site, plus the 3 fixes that matter most.';

const checks = [
  ['Content in the HTML', 'Most AI crawlers don’t run JavaScript. If your content only appears after the page loads, they see an empty page.'],
  ['AI crawlers allowed', 'Whether robots.txt lets OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot and Googlebot in.'],
  ['Structured data', 'Organization, Product, Service and FAQ markup that lets AI state who you are and what you sell.'],
  ['Title and description', 'The one-line summary AI tools and search engines quote back.'],
  ['Sitemap, llms.txt, canonical, share preview', 'The smaller signals that help crawlers find every page and describe it correctly.'],
];

const faqs: Faq[] = [
  {
    q: 'What does the AI Readiness Checker look at?',
    a: 'Your homepage HTML as a crawler receives it, your robots.txt, your llms.txt and your sitemap. It checks whether the content is in the HTML, whether AI crawlers are allowed, and whether the page carries structured data, a title, a description and a canonical link.',
  },
  {
    q: 'Is a high score a guarantee that ChatGPT will recommend me?',
    a: 'No. The score measures whether AI tools can read your site. Whether they recommend you also depends on what the rest of the web says about you. The free AI visibility audit tests the actual answers.',
  },
  {
    q: 'Do you store my URL or my page?',
    a: 'No. The page is fetched once, reduced to a score and a few facts, and discarded. Nothing is logged or saved.',
  },
  {
    q: 'Why does my React or Lovable app score low on content?',
    a: 'Apps that render in the browser send crawlers an almost empty HTML file and fill it in with JavaScript. People see the page; most AI crawlers do not. Prerendering or server rendering fixes it.',
  },
];

const jsonLd = graph([
  {
    '@type': 'WebApplication',
    '@id': 'https://anadithakur.in/ai-readiness#app',
    name: 'AI Readiness Checker',
    description: DESCRIPTION,
    url: 'https://anadithakur.in/ai-readiness',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: { '@id': 'https://anadithakur.in/#business' },
  },
  faqPage(faqs, 'https://anadithakur.in/ai-readiness#faq'),
  breadcrumbs([{ name: 'AI Readiness Checker', path: PATH }], 'https://anadithakur.in/ai-readiness#breadcrumb'),
]);

const ERROR = '#B3261E';
const tone: Record<Status, { mark: string; color: string; word: string }> = {
  pass: { mark: '✓', color: '#2E6B3A', word: 'PASS' },
  warn: { mark: '!', color: p.gold, word: 'IMPROVE' },
  fail: { mark: '✗', color: ERROR, word: 'FIX' },
};

const input: CSSProperties = {
  flex: 1,
  minWidth: 0,
  boxSizing: 'border-box',
  padding: px(s[4], s[5]),
  background: '#fff',
  border: `${rule.base}px solid ${c.ink}`,
  color: p.ink,
  font: `400 17px/1.3 ${display}`,
  borderRadius: 0,
};

type State = { kind: 'idle' } | { kind: 'checking' } | { kind: 'done'; report: Report } | { kind: 'error'; error: string };

const Result = ({ report }: { report: Report }) => {
  const verdict = report.score >= 80 ? 'AI tools can read your site.' : report.score >= 50 ? 'AI tools can read some of it.' : 'AI tools can barely read your site.';
  const auditTo = `/audit?type=ai&url=${encodeURIComponent(report.url)}`;
  return (
    <div style={{ display: 'grid', gap: s[9] }} aria-live="polite">
      <div data-rescue-split style={{ ...split('5fr 7fr'), alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: s[4], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
          <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>AI READINESS · {new URL(report.url).hostname.toUpperCase()}</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: s[3] }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: s[3] }}>
              <span style={{ ...heading('d2'), color: report.score >= 80 ? c.signalOnInk : c.mark }}>{report.score}</span>
              <span style={{ ...label(12, 700, 0.12), color: c.dimOnInk }}>/ 100</span>
            </div>
            <span data-th-mode="night" style={{ lineHeight: 0 }}>
              <TerminalHead face={scoreFace(report.score)} size={60} motion="still" label="" />
            </span>
          </div>
          <p style={{ ...body, color: c.bright }}>{verdict}</p>
        </div>
        <div style={{ display: 'grid', gap: s[5] }}>
          <h2 style={{ margin: 0, ...heading('d5'), textTransform: 'uppercase' }}>Fix these first</h2>
          {report.topFixes.length === 0 ? (
            <p style={lead}>Nothing urgent. The next question is whether AI actually recommends you, which only the full audit answers.</p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
              {report.topFixes.map((f, i) => (
                <li key={f.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[4], padding: px(s[5], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                  <span style={{ ...heading('d6'), color: p.gold }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ display: 'grid', gap: s[2] }}>
                    <span style={{ font: `600 17px/1.3 ${display}` }}>{f.label}</span>
                    <span style={body}>{f.fix}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: s[5] }}>
            <Link to={auditTo} onClick={ctaClick(PAGE, 'result', 'ai')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
              Have me fix it: free audit first<span aria-hidden>→</span>
            </Link>
          </div>
          <p style={{ ...body, fontSize: 14 }}>
            The audit goes further: it asks ChatGPT, Gemini and Perplexity 10 real customer questions and shows who they recommend instead of you.
          </p>
        </div>
      </div>

      <div data-rescue-split style={{ ...split('7fr 5fr'), alignItems: 'start' }}>
        <div>
          <h3 style={{ margin: px(0, 0, s[4]), ...label(11, 700, 0.14) }}>EVERY CHECK</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
            {report.findings.map((f) => (
              <li key={f.id} style={{ display: 'grid', gridTemplateColumns: '5.5em 1fr', gap: s[4], padding: px(s[4], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                <span style={{ ...label(10, 700, 0.12), color: tone[f.status].color }}>
                  {tone[f.status].mark} {tone[f.status].word}
                </span>
                <div style={{ display: 'grid', gap: s[1], minWidth: 0 }}>
                  <span style={{ font: `600 15px/1.3 ${display}` }}>{f.label}</span>
                  <span style={{ ...body, fontSize: 14, overflowWrap: 'anywhere' }}>{f.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 style={{ margin: px(0, 0, s[4]), ...label(11, 700, 0.14) }}>AI CRAWLERS · ROBOTS.TXT</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `400 13px/1.5 ${mono}`, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
            {report.bots.map((b) => (
              <li key={b.ua} style={{ display: 'flex', justifyContent: 'space-between', gap: s[3], padding: px(s[3], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                <span>
                  {b.ua} <span style={{ color: p.dim }}>· {b.who}</span>
                </span>
                <span style={{ color: b.allowed ? '#2E6B3A' : ERROR, whiteSpace: 'nowrap' }}>{b.allowed ? 'allowed' : 'blocked'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const AiReadiness = () => {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const heroFace: THFace =
    state.kind === 'checking' ? 'scan' : state.kind === 'error' ? 'error' : state.kind === 'done' ? scoreFace(state.report.score) : 'prompt';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const checked = checkUrl(url);
    if (checked.ok === false) {
      setState({ kind: 'error', error: checked.error });
      document.getElementById('ar-url')?.focus();
      return;
    }
    setState({ kind: 'checking' });
    try {
      const res = await fetch('/api/ai-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: checked.url }),
      });
      const data = (await res.json().catch(() => ({}))) as { report?: Report; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error || 'The check failed on my end. Try again in a moment.');
      setState({ kind: 'done', report: data.report });
      ctaClick(PAGE, 'checked', 'ai')();
    } catch (err) {
      setState({ kind: 'error', error: err instanceof Error ? err.message : 'The check failed. Try again in a moment.' });
    }
  };

  return (
    <PaperPage header={<SiteHeader page={PAGE} current="ai" />}>
      <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />

      <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[10] }} data-rescue-hpad>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: s[8] }}>
        <div style={{ display: 'grid', gap: s[6], maxWidth: 900, flex: '1 1 480px' }}>
          <span style={{ ...label(11, 700, 0.14), color: p.gold }}>FREE TOOL · 10 SECONDS</span>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
            Can ChatGPT <span style={{ color: p.gold }}>read your site?</span>
          </h1>
          <p style={{ ...lead, maxWidth: '56ch' }}>
            Paste your website. I&apos;ll fetch it the way AI crawlers do and show you what they can see, which AI crawlers
            are blocked, and the three fixes that matter most.
          </p>
          <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: s[3], maxWidth: 720 }}>
            <label htmlFor="ar-url" style={{ ...label(11, 700, 0.14) }}>
              YOUR WEBSITE
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[3] }}>
              <input
                id="ar-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="yourbusiness.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={state.kind === 'error' || undefined}
                aria-describedby={state.kind === 'error' ? 'ar-error' : undefined}
                style={{ ...input, borderColor: state.kind === 'error' ? ERROR : c.ink }}
              />
              <button type="submit" disabled={state.kind === 'checking'} className="pf-nudge" style={{ ...cta, minHeight: 58, border: 0, cursor: 'pointer', opacity: state.kind === 'checking' ? 0.6 : 1 }}>
                {state.kind === 'checking' ? (
                  <>
                    <TerminalHead face="think" size={28} label="" />
                    <span role="status">Checking…</span>
                  </>
                ) : (
                  'Check my site'
                )}
                <span aria-hidden>→</span>
              </button>
            </div>
            {state.kind === 'error' && (
              <p id="ar-error" role="alert" style={{ ...body, color: ERROR, display: 'flex', alignItems: 'center', gap: s[3] }}>
                <TerminalHead face="error" size={40} label="" className="th-inline" />
                <span>{state.error}</span>
              </p>
            )}
          </form>
          <TrustLine items={['Free', 'No sign-up', 'Nothing stored']} />
        </div>
        {/* The Inspector follows the check: ready → scanning → the score's face, or error. */}
        <TerminalHead key={heroFace} face={heroFace} prop="lens" size={160} motion={heroFace === 'fixed' ? 'hop' : 'type'} label="" />
        </div>
      </section>

      {state.kind === 'done' && (
        <section aria-label="Your result" style={section} data-rescue-hpad>
          <Result report={state.report} />
        </section>
      )}

      <section aria-labelledby="h-checks" style={section} data-rescue-hpad>
        <SectionHead id="h-checks" title="What it checks" intro="The things that decide whether an AI tool can read your site at all, before it can recommend you." />
        <ul style={{ listStyle: 'none', margin: px(s[9], 0, 0), padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
          {checks.map(([title, text]) => (
            <li key={title} data-rescue-split style={{ ...split('4fr 8fr'), gap: s[6], padding: px(s[5], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
              <span style={{ font: `600 17px/1.3 ${display}` }}>{title}</span>
              <span style={body}>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <FaqSection faqs={faqs} />
    </PaperPage>
  );
};

export default AiReadiness;
