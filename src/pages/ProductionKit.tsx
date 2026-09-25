import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { track } from '@vercel/analytics';
import { Seo, ORIGIN } from '@/components/Seo';
import KitShell, { Check } from '@/components/kit/KitShell';
import PackPicker from '@/components/kit/PackPicker';
import { body, cta, eyebrow, hint, p } from '@/components/kit/styles';
import { c, display, gutter, heading, label, mono, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import { LATEST, PACK_IDS, pack, type PackId } from '@/data/kit';
import { parsePageParams, toggle } from '@/lib/kit/packs';
import { CURRENCIES, KIT, formatMoney } from '@/lib/kit/product';
import { BUILD_PRICES, usePriceTable } from '@/lib/kit/use-kit-price';

/**
 * `/products/production-kit`: the kit, sold as five packs or the whole thing.
 *
 * Order: what's wrong (hero, then one card per pack's problem), proof (the
 * sample RLS audit's before/after tests), the picker, what's inside, who made
 * it, FAQ, and the free audit for anyone who'd rather have it fixed.
 *
 * The selection lives in the URL (`?packs=auth,launch`), so a shared link, the
 * back button and a cancelled checkout all come back to the same picks.
 * `?pack=<id>` ticks one pack and scrolls to the picker (the free check links
 * here that way); `?upgrade=1` explains the upgrade (the kit's README links
 * here that way). Pack names, problems and file lists come from the release
 * manifest in `src/data/kit`; prices from Stripe (see `use-kit-price`).
 */

const TITLE = 'The Production Kit: rules and checks for AI-built apps';
const DESCRIPTION =
  'Rules, skills and checklists that make Claude Code, Cursor, Lovable and Bolt write code that survives real users. Buy one pack or the full kit.';

const SCAN = '/scan';
const PACKS = PACK_IDS.filter((id) => id !== 'full');

/** From `examples/rls-audit-sample-report.md` in the kit: the rows that show a hole closing, and one that shows nothing broke. */
const PROOF: [test: string, before: string, after: string][] = [
  ['Logged-out visitor reads tasks', '3 rows', '0 rows'],
  ['Logged-out visitor reads users’ emails', 'asha@example.com, ben@example.com', 'no email column'],
  ['Logged-out visitor deletes Ben’s project', 'deleted', 'permission denied'],
  ['Ben makes himself admin', 'admin', 'permission denied'],
  ['Ben reads invoices after editing his own metadata', '2 visible', '1 visible (his own)'],
  ['Ben uploads into Asha’s folder', 'allowed', 'blocked by row-level security'],
  ['Asha reads her tasks', '3 (includes Ben’s)', '2 (hers only)'],
  ['Asha renames her own project', '1 row changed', '1 row changed'],
];

const INSIDE: { title: string; items: ReactNode[] }[] = [
  {
    title: 'Project rules for your AI tool',
    items: [
      <><Code>CLAUDE.md</Code> for Claude Code: security, Supabase Row Level Security, auth, environment variables, deployment, database changes, errors, performance, SEO, changing code without breaking it, planning new features, UI quality and no AI slop.</>,
      <>Cursor rules (<Code>.mdc</Code>): the same rules, set up to load automatically.</>,
      <>For Lovable and Bolt: a short and a full project-knowledge file, and step-by-step prompts that walk the tool through the same checks.</>,
    ],
  },
  {
    title: 'Seven Claude Code skills',
    items: [
      <><b>Supabase RLS audit:</b> finds tables anyone can read or write, writes the fixes, and tests as a logged-out visitor and as a second user.</>,
      <><b>Pre-deploy check:</b> env vars, build, routing, auth redirect URLs, error pages, console errors, Lighthouse.</>,
      <><b>Auth flow fix:</b> diagnoses sign-up, email confirmation, login, password reset, OAuth and session problems.</>,
      <><b>AI visibility:</b> gets a client-rendered app readable by Google, social previews and AI crawlers, and proves it with curl.</>,
      <><b>Safe change:</b> the discipline for fixing things without breaking other things.</>,
      <><b>Plan feature:</b> a short plan you approve before any code: data, who can access what, pages and their states, edge cases.</>,
      <><b>Slop check:</b> reviews changes for work that looks done but isn’t, invented packages, dead code and placeholder content.</>,
    ],
  },
  {
    title: 'Templates',
    items: [
      <>Drop-in files for Vite + React and Next.js: Supabase client, auth provider and route guard, email confirm and password reset pages, error boundary, env checks, the Next.js server setup, a Stripe webhook, robots.txt, a sitemap script and SPA rewrites.</>,
    ],
  },
  {
    title: 'Checklists, SQL and a sample audit',
    items: [
      <>Launch and security checklists. Every security item says how to check it.</>,
      <>A read-only RLS status report, and example policies for owner-only data, public profiles, team workspaces and per-user file storage.</>,
      <>The sample audit above, with the demo schema, the fix and the tests, so you can run it yourself on a throwaway project.</>,
    ],
  },
];

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Which pack do I need?',
    a: <>The one whose problem you have. Not sure? <Link to={SCAN} style={{ color: p.ink }}>Run the free Supabase check</Link>: if it finds open tables, Lock Down Your Data fixes them. Got more than one problem? The picker tells you when the full kit costs less than your picks.</>,
  },
  {
    q: 'I’m not technical. Can I use this?',
    a: 'Yes, if you can copy files into your project or paste text into your tool’s settings. The skills tell the AI what to do; the checklists tell you what to click and what you should see. If you build with Lovable or Bolt, start with the Lovable & Bolt Pack: it’s all copy and paste.',
  },
  {
    q: 'Which tools does it work with?',
    a: <>Claude Code (rules and skills), Cursor (rules and skills), Lovable and Bolt (project knowledge and prompts). Codex, Windsurf and other tools that read <Code>AGENTS.md</Code> can use the main rules file too.</>,
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
    q: 'Which stack is it for?',
    a: 'React or Next.js with Supabase, deployed on Vercel or similar. The deployment, change discipline and SEO parts work with any backend; the database and auth parts are written for Supabase.',
  },
  {
    q: 'Can I use it for client work, or share it with my team?',
    a: 'Yes. You can use it in any number of projects you own or build for clients, and share it with your own team or company. You can’t resell it, give it away, or post the files publicly outside a project that uses them. The LICENSE file in the download has the full terms.',
  },
  {
    q: 'Can I start with one pack and get the rest later?',
    a: 'Yes. Your downloads page has an upgrade to the full kit for its price minus what you’ve already paid for packs.',
  },
  {
    q: 'Do I get updates?',
    a: 'The version you buy is yours to keep. There’s no promise of future updates. If I publish a new version, it shows up on your downloads page, and CHANGELOG.md lists what changed.',
  },
  {
    q: 'Can I get a refund?',
    a: <>If it doesn’t help, email me within 14 days of buying and I’ll refund you in full: <a href="mailto:anadithakur99@gmail.com?subject=Production%20Kit%20refund" style={{ color: p.ink }}>anadithakur99@gmail.com</a>.</>,
  },
  {
    q: 'Is it a guarantee, or a course?',
    a: 'Neither. It’s files you drop into your project. It makes your AI tool much less likely to ship the common mistakes and gives you the checks to catch the rest, but the checklists only work if you run them. If you handle payments at scale, health data or other sensitive information, get a professional review too.',
  },
];

function Code({ children }: { children: ReactNode }) {
  return <code style={{ font: `500 0.9em/1 ${mono}`, color: p.ink }}>{children}</code>;
}

const Section = ({ id, anchor, kicker, title, children }: { id: string; anchor?: string; kicker: string; title: ReactNode; children: ReactNode }) => (
  <section id={anchor} aria-labelledby={id} data-rescue-hpad style={{ containerType: 'inline-size', padding: px(s[11], gutter, 0), scrollMarginTop: s[6] }}>
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

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll to the picker and, if a pack was named, put keyboard focus on its checkbox. */
function goToPicker(id?: PackId) {
  document.getElementById('picker')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (id) document.getElementById(`kit-pack-${id}`)?.focus({ preventScroll: true });
}

/** The page URL for a selection, keeping any other query params and the hash. */
function urlFor(selected: PackId[]) {
  const q = new URLSearchParams(window.location.search);
  q.delete('pack');
  q.delete('packs');
  const rest = q.toString();
  const query = [selected.length ? `packs=${selected.join(',')}` : '', rest].filter(Boolean).join('&');
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}

/** Offers for the JSON-LD: every pack, in every currency Stripe has a price for, as of the build. */
const OFFERS = PACK_IDS.flatMap((id) =>
  CURRENCIES.flatMap((currency) => {
    const amount = BUILD_PRICES[currency][id];
    return amount === undefined
      ? []
      : [{ '@type': 'Offer', name: pack(id).name, price: (amount / 100).toFixed(2), priceCurrency: currency.toUpperCase(), availability: 'https://schema.org/InStock', url: `${ORIGIN}${KIT.path}?pack=${id}` }];
  }),
);

export default function ProductionKit() {
  const [selected, setSelected] = useState<PackId[]>([]);
  const [upgradeNote, setUpgradeNote] = useState(false);
  const [ready, setReady] = useState(false);
  const { currency, table, source } = usePriceTable();
  const money = (id: PackId) => (table[id] === undefined ? '' : formatMoney(currency, table[id]!));
  const cheapest = Math.min(...PACK_IDS.map((id) => table[id] ?? Infinity));

  // The URL is read after mount: the prerendered HTML is the empty picker, so hydration matches.
  useEffect(() => {
    const params = parsePageParams(window.location.search);
    setSelected(params.selected);
    setUpgradeNote(params.upgrade);
    setReady(true);
    if (params.focus) requestAnimationFrame(() => goToPicker(params.selected[0]));
  }, []);

  // Replace, not push: ticking boxes shouldn't fill the back button's history.
  useEffect(() => {
    if (ready) window.history.replaceState(window.history.state, '', urlFor(selected));
  }, [selected, ready]);

  const choose = (id: PackId) => {
    track('pack_selected', { pack: id, from: 'pain_card' });
    setSelected((cur) => toggle(cur, id, true));
    goToPicker(id);
  };

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
          offers: OFFERS,
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
              engineer would tell it, and you can check the result yourself. Buy the pack for the problem you have, or all of it.
            </p>
            <div style={{ display: 'grid', gap: s[3], justifyItems: 'start' }}>
              <a
                href="#picker"
                onClick={(e) => {
                  e.preventDefault();
                  track('kit_buy_click', { where: 'hero' });
                  goToPicker();
                }}
                className="pf-nudge pf-nudge-lg"
                style={cta}
              >
                PICK YOUR PACKS<span aria-hidden>↓</span>
              </a>
              <p style={hint}>
                Not sure what’s wrong?{' '}
                <Link to={SCAN} onClick={() => track('kit_scan_click', { where: 'hero' })} style={{ color: p.ink }}>
                  Run the free Supabase check
                </Link>
                . It takes 30 seconds.
              </p>
            </div>
          </div>

          <aside style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: c.paper }}>
            <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>IN THE FULL KIT</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
              {['CLAUDE.md + Cursor rules', 'Lovable / Bolt project knowledge and prompts', '7 Claude Code skills', 'Auth, Supabase and Stripe templates', 'Launch + security checklists', 'RLS report, example policies and a sample audit'].map((t) => (
                <li key={t} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[3], alignItems: 'start' }}>
                  <span style={{ marginTop: 3 }}>
                    <Check color={c.mark} size={13} />
                  </span>
                  <span style={{ font: `400 14px/1.5 ${display}`, color: c.bright }}>{t}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, font: `400 13px/1.5 ${display}`, color: c.dimOnInk }}>
              Plain Markdown, SQL and TypeScript. Install takes a few minutes; instructions included.
            </p>
          </aside>
        </div>
      </section>

      <Section id="kit-problems" kicker="WHAT’S GOING WRONG" title="Start with the problem you have.">
        <div style={{ display: 'grid', gap: s[6] }}>
          <p style={body}>You built your app with an AI coding tool. It works on your machine. Then real users arrive. Which of these sounds like you?</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${s[13] * 2}px), 1fr))`, gap: s[4] }}>
            {PACKS.map((id) => {
              const info = pack(id);
              return (
                <li key={id} style={{ display: 'grid', gap: s[3], alignContent: 'space-between', padding: px(s[5], s[5]), border: `${rule.hair}px solid ${p.rule}` }}>
                  <div style={{ display: 'grid', gap: s[2] }}>
                    <h3 style={{ margin: 0, font: `600 17px/1.35 ${display}`, color: p.ink }}>{info.problem}</h3>
                    <p style={{ ...body, fontSize: 14 }}>{info.tagline}</p>
                  </div>
                  <a
                    href={`?pack=${id}#picker`}
                    onClick={(e) => {
                      e.preventDefault();
                      choose(id);
                    }}
                    className="pf-underline"
                    style={{ ...label(11, 700, 0.12), color: p.ink, justifySelf: 'start', lineHeight: 1.5 }}
                  >
                    {info.name.toUpperCase()}
                    {money(id) && ` · ${money(id)}`} →
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <Section id="kit-proof" kicker="PROOF" title="What the RLS audit found on a demo app.">
        <div style={{ display: 'grid', gap: s[5] }}>
          <p style={body}>
            From the sample report in the kit: the RLS audit run on a deliberately insecure task app with two made-up users, Asha
            and Ben. The data is fictional; the test results are real output from Postgres, before and after the fix.
          </p>
          <div style={{ overflowX: 'auto', border: `${rule.hair}px solid ${p.rule}` }} tabIndex={0} role="region" aria-labelledby="kit-proof-caption">
            <table style={{ width: '100%', borderCollapse: 'collapse', font: `400 14px/1.45 ${display}`, color: p.body }}>
              <caption id="kit-proof-caption" style={{ ...label(10, 700, 0.14), color: p.dim, textAlign: 'left', padding: px(s[4], s[4], s[2]) }}>
                ATTACK TESTS, BEFORE AND AFTER THE FIX
              </caption>
              <thead>
                <tr>
                  {['Test', 'Before', 'After'].map((h) => (
                    <th key={h} scope="col" style={{ ...label(10, 700, 0.14), color: p.ink, textAlign: 'left', padding: px(s[3], s[4]), borderBottom: `${rule.base}px solid ${c.ink}` }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROOF.map(([test, before, after]) => (
                  <tr key={test}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 500, color: p.ink, padding: px(s[3], s[4]), borderBottom: `${rule.hair}px solid ${p.rule}` }}>
                      {test}
                    </th>
                    <td style={{ padding: px(s[3], s[4]), borderBottom: `${rule.hair}px solid ${p.rule}`, font: `400 13px/1.45 ${mono}` }}>{before}</td>
                    <td style={{ padding: px(s[3], s[4]), borderBottom: `${rule.hair}px solid ${p.rule}`, font: `600 13px/1.45 ${mono}`, color: p.ink }}>{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={hint}>The full report, the demo schema, the fix and the tests are in Lock Down Your Data and in the full kit.</p>
        </div>
      </Section>

      <Section id="kit-pick" anchor="picker" kicker="PICK YOUR PACKS" title="Buy only what you need.">
        <div style={{ display: 'grid', gap: s[6] }}>
          {upgradeNote && (
            <div role="note" style={{ display: 'grid', gap: s[3], padding: px(s[5], s[5]), background: c.accent }}>
              <span style={{ ...label(10, 700, 0.16), color: p.body }}>ALREADY BOUGHT A PACK?</span>
              <p style={{ ...body, color: p.ink }}>
                Open the downloads link in your purchase email. It has an upgrade button that charges the full kit’s price minus
                what you’ve already paid for packs. Lost the email?{' '}
                <a href="mailto:anadithakur99@gmail.com?subject=Production%20Kit%20upgrade" style={{ color: p.ink }}>
                  Email me
                </a>
                .
              </p>
            </div>
          )}
          <PackPicker
            selected={selected}
            onToggle={(id, on) => setSelected((cur) => toggle(cur, id, on))}
            onSwitchToFull={() => setSelected(['full'])}
            currency={currency}
            table={table}
            devPrices={source === 'manifest'}
          />
        </div>
      </Section>

      <Section id="kit-inside" kicker="WHAT’S INSIDE" title="Rules, skills, templates, checklists.">
        <div style={{ display: 'grid', gap: s[8] }}>
          <p style={body}>This is the full kit, version {LATEST.version}. Each pack has the part of it for one problem; the file list is on each card above.</p>
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

      <Section id="kit-who-made" kicker="WHO MADE IT" title="Anadi Thakur.">
        <p style={body}>
          A senior full-stack engineer with 4+ years building React, Next.js, React Native and Node apps, running
          Supabase/Postgres in production, deploying on Vercel, and working on performance and technical SEO. These days a lot
          of that work is fixing apps built with Lovable, Bolt, Cursor and v0. This kit is the set of rules and checks used in
          that work, written so your AI tool can follow them.
        </p>
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

      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: s[6], alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gap: s[6], padding: px(s[9], s[8]), background: c.accent, alignContent: 'start' }}>
            <p style={{ ...eyebrow, color: p.body }}>{Number.isFinite(cheapest) ? `FROM ${formatMoney(currency, cheapest)} · ONE-TIME` : 'ONE-TIME'}</p>
            <p style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' }}>Give your AI tool the rules.</p>
            <a
              href="#picker"
              onClick={(e) => {
                e.preventDefault();
                track('kit_buy_click', { where: 'footer' });
                goToPicker();
              }}
              className="pf-nudge pf-nudge-lg"
              style={{ ...cta, justifySelf: 'start' }}
            >
              PICK YOUR PACKS<span aria-hidden>↑</span>
            </a>
          </div>
          <div style={{ display: 'grid', gap: s[5], padding: px(s[9], s[7]), background: c.plate, color: c.paper, alignContent: 'start' }}>
            <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>RATHER HAVE IT FIXED?</span>
            <p style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.bright }}>
              Get a free audit of your app: security, auth, deploys and performance, with a fixed price for the fix.
            </p>
            <Link to="/rescue/audit" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.accent, justifySelf: 'start' }}>
              FREE AUDIT →
            </Link>
          </div>
        </div>
      </section>
    </KitShell>
  );
}
