import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { track } from '@vercel/analytics';
import { Seo, ORIGIN } from '@/components/Seo';
import KitShell, { Check } from '@/components/kit/KitShell';
import { body, cta, eyebrow, hint, p } from '@/components/kit/styles';
import { c, display, gutter, heading, label, mono, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import { KIT, kitPrice } from '@/lib/kit/product';

/**
 * `/products/production-kit`: the sales page for the kit.
 *
 * Copy is `products/production-kit/SALES-PAGE.md`, less the two lines still
 * marked OWNER TO DECIDE: the refund answer is left off until there is a policy
 * to state. The updates answer is here because it is now simply true: the
 * download zips the repo's kit folder on each request.
 *
 * The Buy button asks `/api/production-kit-checkout` for a Stripe Checkout URL
 * and sends the visitor there; delivery happens on the thank-you page and by
 * email from the webhook.
 */

const TITLE = `${KIT.name}: rules and checks for AI-built apps · Anadi Thakur`;
const DESCRIPTION =
  'CLAUDE.md, Cursor rules, five Claude Code skills, launch and security checklists, and Supabase SQL that make your AI coding tool write code that survives real users.';

const SYMPTOMS = [
  'you’re not sure if strangers can read your database',
  'sign-up emails don’t arrive, or the link sends people to localhost',
  'pages 404 when someone refreshes',
  'every fix the AI makes seems to break something else',
  'your site doesn’t show up in Google, and link previews are blank',
];

const INSIDE: { title: string; items: ReactNode[] }[] = [
  {
    title: 'Project rules for your AI tool',
    items: [
      <><Code>CLAUDE.md</Code> for Claude Code: security, Supabase Row Level Security, auth, environment variables, deployment, database changes, error handling, performance, SEO, and how to make changes without breaking working code.</>,
      <>Cursor rules (<Code>.mdc</Code>): the same rules, set up to load automatically.</>,
      <>A condensed version sized to paste into Lovable or Bolt project knowledge.</>,
    ],
  },
  {
    title: 'Five Claude Code skills',
    items: [
      <><b>Supabase RLS audit:</b> finds tables anyone can read or write, writes the fixes, and tests as a logged-out visitor and as a second user.</>,
      <><b>Pre-deploy check:</b> env vars, build, routing, auth redirect URLs, error pages, console errors, Lighthouse.</>,
      <><b>Auth flow fix:</b> diagnoses sign-up, email confirmation, login, password reset, OAuth and session problems.</>,
      <><b>AI visibility:</b> gets a client-rendered app readable by Google, social previews and AI crawlers, and proves it with curl.</>,
      <><b>Safe change:</b> the discipline for fixing things without breaking other things.</>,
    ],
  },
  {
    title: 'Checklists',
    items: [
      <>Launch checklist: 11 areas, from data security to rollback, as checkboxes.</>,
      <>Security checklist: every item says how to check it.</>,
    ],
  },
  {
    title: 'SQL you can run today',
    items: [
      <>A read-only RLS status report: every table, RLS on/off, policy counts, risky views and functions, public buckets, missing indexes.</>,
      <>Example policies for the common patterns: owner-only data, public profiles, team workspaces, per-user file storage.</>,
    ],
  },
];

const NOT = [
  'Not a course or video series. It’s files you drop into your project.',
  'Not a guarantee. It makes your AI tool much less likely to ship the common mistakes, and gives you the checks to catch the rest. The checklists only work if you run them.',
  'Not a substitute for a professional review if you handle payments at scale, health data or other sensitive information.',
  'Not written for every stack. It’s specific to React / Next.js with Supabase, deployed on Vercel or similar. Much of it applies elsewhere, but the SQL and auth details are Supabase-specific.',
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'I’m not technical. Can I use this?',
    a: 'Yes, if you can copy files into your project or paste text into your tool’s settings. The skills tell the AI what to do; the checklists tell you what to click and what you should see.',
  },
  {
    q: 'Which tools does it work with?',
    a: <>Claude Code (rules + skills), Cursor (rules; skills can be referenced in chat), Lovable and Bolt (condensed rules pasted into project knowledge). Tools that read <Code>AGENTS.md</Code> can use the main rules file too.</>,
  },
  {
    q: 'Will it fix my existing app?',
    a: 'The rules apply to new work. The skills and checklists are for auditing and fixing what’s already there: run the RLS audit and pre-deploy check first.',
  },
  {
    q: 'Is the SQL safe to run?',
    a: <><Code>rls-status.sql</Code> only reads; it changes nothing. <Code>example-policies.sql</Code> creates tables and policies, so read the comments, rename things to match your schema, and run only the parts you need.</>,
  },
  {
    q: 'Does it work with Firebase / another backend?',
    a: 'The deployment, change discipline and SEO parts do. The database and auth parts are written for Supabase.',
  },
  {
    q: 'Do I get updates?',
    a: 'Yes. Your download link always serves the current version of the kit, so come back to it whenever you like.',
  },
];

function Code({ children }: { children: ReactNode }) {
  return <code style={{ font: `500 0.9em/1 ${mono}`, color: p.ink }}>{children}</code>;
}

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'failed'; message: string };

function BuyButton({ where }: { where: 'hero' | 'footer' }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const loading = status.kind === 'loading';

  const buy = async () => {
    track('kit_buy_click', { where });
    setStatus({ kind: 'loading' });
    try {
      const res = await fetch('/api/production-kit-checkout', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setStatus({
        kind: 'failed',
        message: res.status === 501 ? 'Checkout isn’t switched on yet. Email me and I’ll send the kit directly.' : 'Checkout didn’t open. Try again in a moment.',
      });
    } catch {
      setStatus({ kind: 'failed', message: 'Checkout didn’t open. Check your connection and try again.' });
    }
  };

  return (
    <div style={{ display: 'grid', gap: s[3], justifyItems: 'start' }}>
      <button type="button" onClick={buy} disabled={loading} className="pf-nudge pf-nudge-lg" style={{ ...cta, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'OPENING CHECKOUT…' : `GET THE KIT · ${kitPrice}`}
        <span aria-hidden>→</span>
      </button>
      <p style={hint}>One-time payment through Stripe. Instant download, plus a copy of the link by email.</p>
      {status.kind === 'failed' && (
        <p role="alert" style={{ ...hint, color: p.error }}>
          {status.message}{' '}
          {status.message.startsWith('Checkout isn’t') && (
            <a href="mailto:anadithakur99@gmail.com?subject=The%20Production%20Kit" style={{ color: p.ink }}>
              anadithakur99@gmail.com
            </a>
          )}
        </p>
      )}
    </div>
  );
}

const Section = ({ id, kicker, title, children }: { id: string; kicker: string; title: ReactNode; children: ReactNode }) => (
  <section aria-labelledby={id} data-rescue-hpad style={{ containerType: 'inline-size', padding: px(s[11], gutter, 0) }}>
    <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '4fr 7fr', gap: s[10], alignItems: 'start', borderTop: `${rule.edge}px solid ${c.ink}`, paddingTop: s[8] }}>
      <div style={{ display: 'grid', gap: s[3] }}>
        <p style={eyebrow}>{kicker}</p>
        <h2 id={id} style={{ margin: 0, ...heading('d5'), textTransform: 'uppercase', maxWidth: '14ch' }}>
          {title}
        </h2>
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  </section>
);

export default function ProductionKit() {
  return (
    <KitShell>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path={KIT.path}
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: KIT.name,
          description: DESCRIPTION,
          url: `${ORIGIN}${KIT.path}`,
          brand: { '@type': 'Person', name: 'Anadi Thakur' },
          offers: { '@type': 'Offer', price: (KIT.amount / 100).toFixed(2), priceCurrency: KIT.currency.toUpperCase(), availability: 'https://schema.org/InStock' },
        }}
      />

      <section data-rescue-hpad style={{ containerType: 'inline-size', padding: px(s[10], gutter, 0) }}>
        <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: s[10], alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: s[7], minWidth: 0 }}>
            <p style={eyebrow}>THE PRODUCTION KIT · FOR CLAUDE CODE, CURSOR, LOVABLE AND BOLT</p>
            <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '17ch' }}>
              Make your AI tool write code that <span style={{ color: p.gold }}>survives real users.</span>
            </h1>
            <p style={{ ...body, font: `400 18px/1.5 ${display}`, maxWidth: '52ch' }}>
              Rules, skills and checklists for React / Next.js + Supabase apps, so your AI coding tool follows what a senior
              engineer would tell it, and you can check the result yourself before launch.
            </p>
            <BuyButton where="hero" />
          </div>

          <aside style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
            <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>WHAT YOU DOWNLOAD</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
              {['CLAUDE.md + Cursor rules', 'Lovable / Bolt project knowledge', '5 Claude Code skills', 'Launch + security checklists', 'Supabase RLS report + example policies'].map((t) => (
                <li key={t} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[3], alignItems: 'start' }}>
                  <span style={{ marginTop: 3 }}>
                    <Check color={c.mark} size={13} />
                  </span>
                  <span style={{ font: `400 14px/1.5 ${display}`, color: c.bright }}>{t}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, font: `400 13px/1.5 ${display}`, color: c.dimOnInk }}>
              Plain Markdown and SQL. Install takes a few minutes; instructions included.
            </p>
          </aside>
        </div>
      </section>

      <Section id="kit-who" kicker="WHO IT’S FOR" title="It works on your machine. Then real users arrive.">
        <div style={{ display: 'grid', gap: s[6] }}>
          <p style={body}>You built your app with an AI coding tool. It works on your machine. But:</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.hair}px solid ${p.rule}` }}>
            {SYMPTOMS.map((t) => (
              <li key={t} style={{ padding: px(s[4], 0), borderBottom: `${rule.hair}px solid ${p.rule}`, font: `500 17px/1.45 ${display}`, color: p.ink }}>
                {t}
              </li>
            ))}
          </ul>
          <p style={body}>
            You don’t need to become a senior engineer. You need your AI tool to follow the rules a senior engineer would give
            it, and a way to check the result. The kit is for non-technical and semi-technical founders who build with Claude
            Code, Cursor, Lovable, Bolt or v0 and run on Supabase and Vercel (or similar).
          </p>
        </div>
      </Section>

      <Section id="kit-inside" kicker="WHAT’S INSIDE" title="Rules, skills, checklists, SQL.">
        <div style={{ display: 'grid', gap: s[8] }}>
          {INSIDE.map((group) => (
            <div key={group.title} style={{ display: 'grid', gap: s[4] }}>
              <h3 style={{ margin: 0, ...label(11, 700, 0.14), color: p.ink }}>{group.title.toUpperCase()}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[3] }}>
                {group.items.map((item, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[3], alignItems: 'start' }}>
                    <span style={{ marginTop: 5 }}>
                      <Check size={12} />
                    </span>
                    <span style={{ ...body, fontSize: 15 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="kit-not" kicker="WHAT IT’S NOT" title="Honest about the edges.">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
          {NOT.map((t) => (
            <li key={t} style={body}>
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="kit-faq" kicker="FAQ" title="Before you buy.">
        <div style={{ borderTop: `${rule.hair}px solid ${p.rule}` }}>
          {FAQ.map((f) => (
            <details key={f.q} style={{ borderBottom: `${rule.hair}px solid ${p.rule}`, padding: px(s[5], 0) }}>
              <summary style={{ cursor: 'pointer', font: `600 17px/1.4 ${display}`, color: p.ink }}>{f.q}</summary>
              <p style={{ ...body, fontSize: 15, marginTop: s[3] }}>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="kit-who-made" kicker="WHO MADE IT" title="Anadi Thakur.">
        <p style={body}>
          A senior full-stack engineer with 4+ years building React, Next.js, React Native and Node apps, running
          Supabase/Postgres in production, deploying on Vercel, and working on performance and technical SEO. These days a lot
          of that work is fixing apps built with Lovable, Bolt, Cursor and v0. This kit is the set of rules and checks used in
          that work, written so your AI tool can follow them.
        </p>
      </Section>

      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: s[6], alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gap: s[6], padding: px(s[9], s[8]), background: c.accent, alignContent: 'start' }}>
            <p style={{ ...eyebrow, color: p.body }}>{kitPrice} · ONE-TIME</p>
            <p style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>Give your AI tool the rules.</p>
            <BuyButton where="footer" />
          </div>
          <div style={{ display: 'grid', gap: s[5], padding: px(s[9], s[7]), background: c.plate, color: '#fff', alignContent: 'start' }}>
            <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>RATHER HAVE IT FIXED FOR YOU?</span>
            <p style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.bright }}>
              Get a free audit of your app: security, auth, deploys and performance, with a fixed price for the fix.
            </p>
            <Link to="/rescue/audit" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.accent, justifySelf: 'start' }}>
              FREE PRODUCTION AUDIT →
            </Link>
          </div>
        </div>
      </section>
    </KitShell>
  );
}
