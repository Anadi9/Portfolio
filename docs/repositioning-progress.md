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
- [ ] **4. Unified `/audit` form** (`type=ai|dpdp|app`; `/rescue/audit` → `/audit?type=app`)
- [ ] **5. Intent-matched CTAs on notes, sitemap/llms generation, nav and internal links**
- [ ] **6. AI Readiness Checker** (free tool)
- [ ] **7. DPDP self-check quiz**
- [ ] **8. AEO answer-first content** (AI visibility and DPDP clusters)

## Needs Anadi before launch

- Verify the Shopify "AI orders grew 15×" stat and link the source, or cut it.
- Verify the DPDP Rules phase-in dates that the "May 2027" line relies on.
- Check AI Visibility prices against competitors.
- Decide DPDP pricing (the `/dpdp` page currently says "fixed quote after the free check").
- Have a lawyer skim the `/dpdp` FAQ answers before launch.
- Record the 60-second intro video and the sample report image.
- After deploy: submit the sitemap in Google Search Console and Bing Webmaster Tools.
