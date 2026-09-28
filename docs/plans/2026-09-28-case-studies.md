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
- [x] 8. Client: LA-PTE, AppWalker, written as pending. (XPAND removed 2026-09-29.)
- [x] 9. Portfolio Work section links to `/work`.
- [x] 10. lint, test, build; check prerendered HTML heads.

## theanta.com

- Out of scope here. Anadi is doing ANTA's case studies separately in its own
  repo. Draft copy stays in `docs/drafts/theanta-case-studies.md` for reuse.

## Decided by Anadi (2026-09-28)

- No employer and no dates on client projects; role only.
- Every client can be named.
- No metrics or numbers on client projects, ever.
- Signal's source of truth is github.com/theanta/signal. The study and the
  front-page card now match it: Groq (Llama 3.3 70B), not Claude; rule-based
  scoring; Jun – Jul 2026; still no outreach results claimed.
- ZEISS front-page card leads with the React component system, no AEM.
- No case studies for Boardsi, Groovepacker, Royal Mindfulness, Sellerchamp,
  or the earlier learning projects.

## Waiting for Anadi

Each client study goes live when its row is filled: set `role`, add `link`
for the mobile apps, flip `status` to `live`.

| Study | Role | Store links | Other |
|---|---|---|---|
| ZEISS Microscopy | [ ] | n/a | link set: zeiss.com/microscopy/us/home.html |
| IoT Industry | [ ] | n/a | link set: ioti.io |
| AppWalker | [ ] | n/a | |
| Sonee Sports | [ ] | [ ] App Store · [ ] Play Store | |
| LA-PTE | [ ] | [ ] App Store · [ ] Play Store | [ ] what you built, 1–2 decisions |

## Log

- 2026-09-28: tasks 1–10 built in one round. See commit on `case-studies`.
- 2026-09-28: Rescue Teardown case study removed.
- 2026-09-28: Anadi's decisions applied (above); Signal rewritten from its repo.
- 2026-09-29: XPAND removed; ZEISS link points at the Microscopy home page.
