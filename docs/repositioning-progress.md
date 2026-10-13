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
- [ ] **2. Hub homepage at `/`, Rescue moved to `/rescue`** (+ llms.txt rewrite)
- [ ] **3. `/ai-visibility` and `/dpdp` service pages**
- [ ] **4. Unified `/audit` form** (`type=ai|dpdp|app`; `/rescue/audit` → `/audit?type=app`)
- [ ] **5. Intent-matched CTAs on notes, sitemap/llms generation, nav and internal links**
- [ ] **6. AI Readiness Checker** (free tool)
- [ ] **7. DPDP self-check quiz**
- [ ] **8. AEO answer-first content** (AI visibility and DPDP clusters)

## Needs Anadi before launch

- Verify the Shopify "AI orders grew 15×" stat and link the source, or cut it.
- Verify the DPDP Rules phase-in dates that the "May 2027" line relies on.
- Check AI Visibility prices against competitors.
- Record the 60-second intro video and the sample report image.
- After deploy: submit the sitemap in Google Search Console and Bing Webmaster Tools.
