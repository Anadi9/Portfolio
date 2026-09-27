# Sales fixes: the loop's task list

Source: the sales critique of 2026-09-26. Decisions made by Anadi on 2026-09-27:
the Production Kit becomes a free, fully open download (no email); guarantee,
three price tiers, dropping the iOS add-on, reply-for-a-call and keeping the
"Vibe Code Rescue" name are all accepted as recommended.

## Rules for every round

1. Take the first task marked `[ ]`. Do that task only.
2. Branch `sales-fixes`. Never push, deploy, send email, or touch Stripe.
3. Never invent proof: no testimonials, client names, numbers or quotes that
   aren't already published on the site or given here.
4. Check: `npm run lint`, `npm test`, `npm run build`, then screenshots of the
   touched pages from `npm run preview` at 1440×900 and 390×844.
5. A second agent that didn't write the change judges the screenshots and
   diff against the task's **Done when**.
6. Pass → one commit, mark `[x]`, add a line to the log. Fail → one retry;
   fail again → mark `[!]`, write why, move on.
7. Stop when nothing is `[ ]`, or after 25 rounds. Then report.

Marks: `[ ]` to do · `[x]` done · `[!]` blocked · `[?]` waiting for Anadi.

## Home page (`src/pages/Rescue.tsx`)

- [x] **1. Take the kit out of the buying path.** Remove the kit sentence from the
  tally panel and from the add-ons intro. The footer keeps a "Free Production Kit" link.
  *Done when:* above the footer, the home page has no link to the kit.

- [x] **2. Drop the iOS & Android add-on.** Two add-ons remain; Production care
  first, framed as what comes after the handover.
  *Done when:* no "$989" or "iOS" on the page or in its JSON-LD.

- [x] **3. Three price tiers.** Replace the lone "$499 FIXES FROM" with:
  Single fix $499 (one area) · Launch rescue $1,200–1,800 (2–3 areas) ·
  Full rescue from $2,500 (all four areas). Keep "every quote is fixed first".
  *Done when:* all three tiers render, readable at 390px, JSON-LD still valid.

- [x] **4. Guarantee and two FAQs.** Under the price: "Fixed price. If I don't fix
  something in the quote, you don't pay for it." Add FAQs "What does it
  usually cost?" (the tiers) and "What if you can't fix it?" (the guarantee).
  *Done when:* guarantee visible in the price section; both FAQs in the page and FAQPage JSON-LD.

- [x] **5. Real proof under the hero.** In the strip under the hero, add what
  the portfolio already publishes: years shipping, production releases
  (`site.releases`), ZEISS, and the "shipped for" clients. Read the values from
  the portfolio's data, don't retype them.
  *Done when:* the strip shows those facts and every one of them traces to existing portfolio data.

- [x] **6. A face above the fold.** Small portrait plus "Anadi Thakur · full-stack
  engineer" in the hero.
  *Done when:* the portrait is visible in the first screen at 1440×900 and 390×844.

- [x] **7. Plain words instead of jargon.** Rewrite body copy and the sample report
  so they say what happens to the user ("anyone can download your user list").
  Remove the capitals tech-stack line (it stays on the portfolio).
  *Done when:* the page's visible text, outside the error-log terminal, has
  none of: RLS, env variables, JSON-LD, SSR, Core Web Vitals, AEM, schemas, endpoints.

- [x] **8. Readable buttons.** Main CTAs on the home, audit and kit pages: 15px+,
  normal case instead of spaced capitals.
  *Done when:* every primary CTA is ≥15px and not uppercase; nav can stay as is.

- [x] **9. Error log on phones.** Long lines wrap instead of being cut off.
  *Done when:* no horizontal scroll inside the log at 390px.

## Audit form (`src/pages/RescueAudit.tsx`, `src/lib/rescue/intake.ts`)

- [x] **10. Email second, softer promise, offer a call.** Email field right after the
  app link. "No follow-up sequence, no pressure" → "One follow-up, then I leave
  you alone." Step 03 and the confirmation email add: "When the report arrives,
  reply if you'd like a 15-minute call to go through it."
  *Done when:* field order is app link → email → rest; tests for the emails updated and passing.

## Notes

- [ ] **11. Point Notes at the buyer.** "Start here" shows the three Fixes posts on
  Supabase RLS, broken sign-up/login and works-locally-breaks-on-Vercel.
  The Notes header gets a "Free audit" link.
  *Done when:* those three cards render and the header link goes to `/rescue/audit`.

## Free Production Kit

- [ ] **12. Serve the full kit as a static file.** Copy
  `~/Downloads/production-kit/release/dist/1.2.0/production-kit-full-v1.2.0.zip`
  to `public/downloads/`, after checking its sha256 against the 1.2.0 manifest.
  *Done when:* `npm run preview` serves it with status 200 and the same sha256.

- [ ] **13. Kit page becomes a free download.** Replace the pack picker with one
  "Download the kit, free" button (tracked). Hero speaks to founders building
  their app with AI. Remove price, refund, upgrade and "which pack" FAQs; the
  license FAQ follows task 15. JSON-LD offer price 0. Portrait next to "Who
  made it". The closing "Rather have it fixed? Free audit" band stays.
  *Done when:* no page links to Stripe checkout; the button downloads the zip; tests pass.

- [ ] **14. "Free" everywhere else.** Every `<KitPrice />` mention and
  "₹/$ Production Kit" on the site says "free". `/scan` links still land on the kit page.
  *Done when:* no kit price appears anywhere in the built site.

- [ ] **15. License for a free kit.** [?] The LICENSE in the zip is written for
  buyers and forbids posting the kit publicly. Draft a new LICENSE (free to use
  and share with credit, no reselling) into `docs/drafts/kit-license.md`. Changing
  the zip itself waits for Anadi's OK.
  *Done when:* draft written; task marked `[?]`.

- [ ] **16. Leave earlier buyers untouched.** `/kit/thanks`, `/kit/downloads/:token`,
  `/api/production-kit-download` and the Stripe webhook keep working as they are.
  Draft a thank-you email to earlier buyers with $19 off a rescue in
  `docs/drafts/kit-buyers-email.md`. Not sent.
  *Done when:* existing kit tests pass unchanged; draft written.

## Waiting for Anadi (the loop never does these)

- Testimonials, case studies, a Loom audit walkthrough.
- The kit LICENSE change (task 15).
- Sending the buyers email (task 16).
- Merging `sales-fixes` into `main` and deploying.

## Log

<!-- One line per round: date · task · result · commit -->
2026-09-27 · 1 · pass (judge: PASS; lint has 3 errors that predate this branch, none new) · see commit
2026-09-27 · 2 · pass (judge: PASS; two add-ons, care first) · see commit
2026-09-27 · 3 · pass (judge: PASS; its note on uneven mobile rows fixed after, rechecked by screenshot) · see commit
2026-09-27 · 4 · pass (judge: PASS; FAQ answers built from the same tiers and guarantee constants) · see commit
2026-09-27 · 5 · pass (judge: PASS; strip reads `site` from src/data/portfolio.ts) · see commit
2026-09-27 · 6 · pass (judge: PASS; byline under the pitch, same portrait file as the engineer section) · see commit
2026-09-27 · 7 · pass on retry (judge FAIL: bio and visibility copy overclaimed; fixed, then PASS) · see commit
2026-09-27 · 8 · pass (judge: PASS; all primary CTAs measured 16px, sentence case, incl. sticky bar) · see commit
2026-09-27 · 9 · pass (judge: PASS; no overflow at 320/390/1440, desktop unchanged) · see commit
2026-09-27 · 10 · pass (judge: PASS; validation order now matches the form, +2 tests) · see commit
