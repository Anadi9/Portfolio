# Repositioning progress

Branch: `repositioning`. Umbrella: "Get your business ready for the AI era", with three
services: AI Visibility (`/ai-visibility`), DPDP Readiness (`/dpdp`) and Vibe Code Rescue
(`/rescue`). One free audit (`/audit?type=ai|dpdp|app`), then a fixed-price fix.

Each milestone ends with `npx vitest run` and `npm run build` green and one commit.
Nothing is pushed or deployed from this loop.

## Milestones

- [x] **1. SEO/AEO/GEO technical base**
  - `src/lib/schema.ts`: one `ProfessionalService` (`#business`) and one `Person` (`#person`)
    entity, plus `breadcrumbs`, `faqPage`, `service` and `graph` helpers.
  - Notes, work and case-study pages now name the Person by `@id` and the business as publisher.
  - `public/robots.txt`: AI crawlers allowed by name, `/api/` and `/kit/` disallowed, `Sitemap:` line.
  - Fixed the pre-existing failing test: `/drops/roadmap` search title and description were over length.
  - llms.txt rewrite moved to milestone 2, so it never lists a route that doesn't exist yet.
- [x] **2. Hub homepage at `/`, Rescue moved to `/rescue`**
  - `src/pages/Hub.tsx`: copy doc's homepage with three service cards, how-it-works, why-me,
    free tools, FAQ (+ `FAQPage`), and the site's `WebSite`/`ProfessionalService`/`Person` graph.
  - `src/components/site/kit.tsx`: shared header (service nav), footer, sections, FAQ and final band.
  - `/rescue` serves Vibe Code Rescue (canonical `/rescue`, `Service` + breadcrumb JSON-LD);
    the old `/rescue` → `/` redirect is gone. "Vibe Code Rescue" links now point at `/rescue`.
  - llms.txt rewritten around the umbrella and three services; sitemap lists a page only once
    the build has prerendered it.
  - New `cta_click` analytics event (page, location, service).
  - DPDP date verified: Rules notified Nov 2025, core obligations at 18 months (≈13 May 2027),
    Consent Manager provisions at 12 months (≈Nov 2026).
- [x] **3. `/ai-visibility` and `/dpdp` service pages**
  - `src/pages/AiVisibility.tsx`: copy doc's page, fictional sample report, pricing table,
    FAQ; `Service` with four offers, `FAQPage`, breadcrumb.
  - Shopify 15× stat verified (Shopify's own number, Jan–Dec 2025, "small base" caveat added,
    source linked). "Buy inside the AI chat" softened: in-chat checkout was largely shelved.
  - `src/pages/Dpdp.tsx`: written fresh (the doc had no page copy) from the Act and Rules:
    timeline, what gets built, process, who it's for, FAQ (dates, penalties, 72-hour breach
    report, GDPR overlap), not-legal-advice line. No prices: fixed quote after the free check.
  - Phone-width screenshots not taken (browser window wouldn't resize); pages reuse the
    `/rescue` responsive hooks. Re-check before launch.
- [x] **4. Unified `/audit` form**
  - `src/pages/Audit.tsx`: chooser (AI Visibility, DPDP, Both, App rescue, Not sure),
    pre-selected from `?type=`; the choice is kept in the URL.
  - AI/DPDP/Both/Not sure: the copy doc's fields → `api/audit.ts` + `src/lib/audit/intake.ts`
    (validation shared by browser and server, escaped emails, WhatsApp optional, DPDP-minded
    "used only to send your report" line + privacy link + erase-on-request in the receipt).
  - App: the old `/rescue/audit` form, extracted to `src/components/audit/AppAuditForm.tsx`,
    unchanged API (`/api/rescue-audit`). `/rescue/audit` 301s to `/audit?type=app`; `?s=` carries over.
  - Every internal link moved to `/audit?type=app` (notes, Scan, Teardown, kit pages, emails).
  - 17 new tests; `api/` allowlist and serverless import graph updated; `npm run check` updated
    for the new sitemap (37 URLs).
  - Sender is `audit@anadithakur.in` (same Resend domain as `rescue@`).
- [x] **5. Intent-matched CTAs on notes, sitemap/llms generation, nav and internal links**
  - `ServicesCta` closes every drop, wisdom and dispatch post (three free checks).
  - Fix posts keep the app-audit CTA; the "invisible to Google and ChatGPT" post adds
    "Test what AI can see" → `/ai-readiness`.
  - Notes header "Free audit" → `/audit` chooser; notes footer links the three services.
  - `/rescue` header gets "All services"; its closing band cross-sells AI Visibility.
  - Portfolio hero and meta description restated for the new positioning; its CTA → hub.
  - Sitemap/llms generation was done in milestone 2; verified again (37 URLs, `npm run check` OK).
- [x] **6. AI Readiness Checker** (`/ai-readiness`)
  - `src/lib/readiness/analyze.ts` (pure): RFC 9309 robots.txt matching for 8 AI/search crawlers,
    content-in-HTML word count, JSON-LD types, title/description/H1/canonical/og/noindex,
    sitemap and llms.txt; weighted 0–100 score and top 3 fixes.
  - `src/lib/readiness/url.ts` + `check.ts`: SSRF guard (no IP literals, private/loopback/
    link-local/metadata ranges refused after DNS on every hop, manual redirects ≤3, 8s timeout,
    2MB cap, nothing stored or logged). `api/ai-readiness.ts`: 6 checks/min per IP.
  - Result hands the URL to `/audit?type=ai&url=…`, which pre-fills it.
  - 48 new tests. Live runs: anadithakur.in scores 100; example.com 40; metadata IP and
    localhost refused; a bot-blocking site (403) gets a specific message.
- [ ] **7. DPDP self-check quiz**
- [ ] **8. AEO answer-first content** (AI visibility and DPDP clusters)

## Needs Anadi before launch

- Verify the Shopify "AI orders grew 15×" stat and link the source, or cut it.
- Verify the DPDP Rules phase-in dates that the "May 2027" line relies on.
- Check AI Visibility prices against competitors.
- Decide DPDP pricing (the `/dpdp` page currently says "fixed quote after the free check").
- No booking link exists yet; the confirmation says "reply to book a 20-minute call". Add a Cal.com/Calendly link if you want one.
- Have a lawyer skim the `/dpdp` FAQ answers before launch.
- Record the 60-second intro video and the sample report image.
- After deploy: submit the sitemap in Google Search Console and Bing Webmaster Tools.
