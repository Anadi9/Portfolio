# Case studies: the loop's task list

Source: the case-studies context brief (2026-09-28). Build on branch
`case-studies`. Never push, deploy, send email or name a client/metric that
isn't already published on the site or confirmed by Anadi.

Marks: `[ ]` to do · `[x]` done · `[!]` blocked · `[?]` waiting for Anadi.

## How pending work is held back

Every case study lives in `src/data/caseStudies.ts` with a `status`.
`live` studies prerender at `/work/<slug>` and appear on `/work` and in the
sitemap. `pending` studies are fully written but only render in `npm run dev`
(the same rule notes drafts follow), each with a `pending` list saying exactly
what it waits on. Publishing one = answer its questions, fill the
`[Add …]` placeholders, flip `status` to `live`.

## anadithakur.in (this repo)

- [x] 1. Data model + `/work` index (filters All · Client · Personal · Mobile)
  and `/work/:slug` page, prerendered, own `<title>`, description, canonical, OG.
- [x] 2. Sitemap lists `/work` and every prerendered study.
- [x] 3. Personal: The Wrapper Test (P3), live.
- [x] 4. Personal: The Production Kit (P4), live. CTA is the free download
  (the kit went free on 2026-09-27; the brief's $19 is out of date).
- [x] 5. Personal: Signal (P2), live, told without any outreach results.
- [x] 6. ~~Personal: Rescue Teardown (P1)~~ removed at Anadi's request (2026-09-28).
- [x] 7. Client: ZEISS, IoT Industry, Sonee Sports, written as pending.
- [x] 8. Client: XPAND, LA-PTE, AppWalker, written as pending.
- [x] 9. Portfolio Work section links to `/work`.
- [x] 10. lint, test, build; check prerendered HTML heads.

## theanta.com

- [?] 11. The theanta.com source repo (Vite + React + shadcn) is not on this
  machine: `~/Desktop/anta-website` holds only planning docs and
  `~/anta-landing` is a static HTML mock. Copy for the Signal flagship and the
  "Founder's track record" block is drafted in
  `docs/drafts/theanta-case-studies.md`, ready to drop in once the repo is
  available.

## Waiting for Anadi

- [?] **Employer per client project:** ZEISS (ZenQua vs Precious Infosystem;
  the portfolio's journey says Precious), IoT Industry, Sonee Sports, XPAND,
  LA-PTE, AppWalker.
- [?] **Permission to name each client**, ZEISS especially. (ZEISS and IoT
  Industry are already named on the portfolio front page.)
- [?] **Timelines** for every client project; ZenQua dates (Apr 2024 – Jun 2025
  vs Apr 2024 – Aug 2026).
- [?] **Store links** for Sonee Sports, XPAND, LA-PTE.
- [?] **Metrics:** any verifiable source for Sonee Sports +15% sales or the
  LA-PTE numbers. None are used until then.
- [?] **Boardsi, Groovepacker, Royal Mindfulness, Sellerchamp:** include? role?
  company? Nothing written for these.
- [?] **Earlier projects (P5):** which were personal (video calling, React Flow
  editor, StoryTeller, eCommerce). Nothing written for these.
- [?] **Signal copy conflict:** the portfolio front page says Signal is
  "2025, running daily" and lists five scraped sources; the brief describes an
  Apollo → Clay → Claude → HubSpot → Lemlist design and says it has never run
  live outreach. The case study uses only the published facts and says no
  outreach has been sent. Confirm which pipeline is current, and whether
  "running daily" should stay on the front page.
- [?] **ZEISS stack line:** the portfolio card leads with AEM; the brief says
  lead with the React component system. The case study does; the front-page
  card is untouched until you say so.

## Log

- 2026-09-28: tasks 1–10 built in one round. See commit on `case-studies`.
- 2026-09-28: Rescue Teardown case study removed.
