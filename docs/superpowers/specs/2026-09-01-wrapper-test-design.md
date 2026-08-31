# The Wrapper Test — free self-serve teardown

Date: 2026-09-01
Status: approved design, not yet implemented
Scope: one new route (`/teardown`), one new pure-logic module
(`src/lib/teardown/`), one Vercel serverless function (`api/`), and two link
edits (`/work-with-me`, `drops/system`). No changes to the front page, the
notes corpus, the motion engine, the banner generators, or the feeds' shape.

---

## 1. Problem

`/work-with-me` sells two things: a $199 recorded Teardown and a $750+ Build.
Both start with an Instagram DM. The page converts people who already trust the
work — but it asks a stranger to message a stranger and then pay, with nothing
in between. There is no rung on the ladder below $199.

Meanwhile the site already gives away substantial artefacts: six drops, one of
them (`drops/system`) a nine-section design template with a fully worked
example. The give-away habit exists. What is missing is a give-away that is
*about the reader's own product* rather than about the craft in general.

A free tool that diagnoses the reader's AI feature closes that gap. The
diagnosis creates the itch; the $199 teardown is the scratch.

Two constraints shape the answer:

- **The site is statically prerendered.** `vite-react-ssg` renders every route
  in `src/routes.tsx` to HTML at build time. Anything added has to prerender,
  or it resolves to an empty root div for the crawler and for anyone opening
  the link cold.
- **There is no backend and no database.** `api/` does not exist. The only
  server-side code in the repo runs at build time (`scripts/*.mjs`).

## 2. Decisions

Settled during brainstorming. Recorded so the implementation plan does not
relitigate them.

1. **The user supplies the facts; the tool supplies the judgement.** No URL
   scraping, no LLM, no inference about a product the tool cannot see. The
   reader answers a structured questionnaire and the tool scores *their own
   answers*. This makes the output accurate by construction, costs nothing per
   run, and cannot hallucinate a finding about someone's architecture.

2. **The frame is the wrapper test, the structure is the nine sections.** The
   headline verdict scores four wrapper-test axes — the test `/work-with-me`
   already names in its own copy. The written report is organised by the nine
   sections of `drops/system`, so the free report and the existing free drop
   reinforce each other instead of competing.

3. **Diagnose, never prescribe.** The free tool says *where* you are thin, with
   specificity, and stops before *what to do about it*. That gap is precisely
   what the $199 teardown sells. This is enforced structurally, not by
   discipline: the finding model in §5 has no `fix`, `recommendation` or
   `nextStep` field, so there is nowhere for a prescription to be written even
   by accident.

4. **The verdict is ungated; the report is email-gated.** Score, verdict and
   the three weakest sections appear immediately with nothing asked. The
   full nine-section breakdown costs an email address. This builds a list
   without making the first impression a paywall.

5. **The gate leaks, and that is accepted.** The report is computed in the
   browser from data already in the page bundle. Anyone reading source gets it
   free. Hardening it would require moving the report server-side and paying
   for a round trip on every reveal, to protect a free artefact. Not worth it.

6. **The report renders instantly *and* is emailed.** Submitting the email
   reveals the report in-browser at once and fires the send in the background.
   Nobody waits on an inbox, and a copy still lands there as a re-engagement
   surface. A failed send therefore degrades to "no email arrived", never to
   "no report".

7. **The server re-computes; it never trusts a client-sent report.** The POST
   body carries the raw answers (small integers) and the email — not the
   scored output. The function runs the same pure modules the browser ran.
   One source of truth, and a payload small enough to validate exhaustively.

8. **No database.** The contact goes to a Resend audience; the report is
   regenerated from answers whenever needed. Nothing is persisted by us.

9. **`/teardown` is meant to be found.** Unlike `/work-with-me`, which is
   deliberately absent from every nav and shared by link, this page is a search
   and social entry point. It gets full `Seo`, and its first question renders
   into the prerendered HTML rather than sitting behind a "Start" click, so
   the page has real content for a crawler.

## 3. Not building

Named so the plan does not drift into them.

- No LLM anywhere in the flow.
- No accounts, no saved results, no resumable sessions.
- No PDF. The emailed report is HTML.
- No shareable result URLs in v1. Deferred, not rejected: answers are a fixed
  array of small integers, so a `?r=<base36>` permalink stays cheap to add
  later. It is not needed to prove the tool works.
- No A/B testing of copy, no analytics on individual answers.
- No changes to the "No form to fill out" line at
  `src/pages/WorkWithMe.tsx:139`. That sentence is about the paid teardown and
  remains true of it. The free tool must never present itself as the paid one.

## 4. The questionnaire

**13 questions, single-select, four options each, target three minutes.**

Every question carries two tags: the **axis** it scores and the **section** it
reports under. Axes produce the headline verdict; sections produce the report.

Axes:

| Axis | Asks |
|---|---|
| `defensibility` | What is left of this if the model vendor ships it next month? |
| `failure` | What happens when the model is slow, wrong, or down? |
| `cost` | Do the unit economics survive the tenth thousand user? |
| `evaluation` | How would you know quality got worse? |

Question → section → axis map:

| # | Section (from `drops/system`) | Axis |
|---|---|---|
| 1 | 1. Problem statement | `defensibility` |
| 2 | 2. Requirements | `evaluation` |
| 3 | 3. Constraints | `cost` |
| 4 | 4. Architecture | `defensibility` |
| 5 | 4. Architecture | `failure` |
| 6 | 5. Data model | `defensibility` |
| 7 | 6. API contract | `failure` |
| 8 | 7. Failure modes | `failure` |
| 9 | 7. Failure modes | `cost` |
| 10 | 8. Tradeoffs | `cost` |
| 11 | 8. Tradeoffs | `defensibility` |
| 12 | 9. Open questions | `evaluation` |
| 13 | 9. Open questions | `evaluation` |

Each option carries a weight of 0–3. Every question's fourth option is a
literal **"I'm not sure"**, which also weighs 0 but is recorded as `unknown`
rather than as a low score.

That distinction is load-bearing and comes from `drops/system` itself, which
says an honest *unknown* is worth more than a guess dressed up as a fact. The
report therefore separates **"you decided badly"** from **"you have not decided
yet"** — a distinction no generic scorecard makes, and the single most useful
thing the free tool tells anyone.

## 5. Data model

Pure TypeScript, no framework types, in `src/lib/teardown/`.

```ts
type Axis = 'defensibility' | 'failure' | 'cost' | 'evaluation';
type SectionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Authored content. `findings` is indexed by option, and is the ONLY place a
 *  finding sentence may come from — see decision 3. */
type Question = {
  id: string;
  section: SectionId;
  axis: Axis;
  prompt: string;
  options: { label: string; weight: 0 | 1 | 2 | 3; unknown?: true }[];
  findings: string[];          // parallel to options; observation only
};

/** The wire format. 13 option indices. */
type Answers = number[];

/** `score.ts` output — numbers and bands only. No prose. */
type Result = {
  score: number;                    // 0..100, rounded
  verdict: VerdictBand;
  axes: Record<Axis, number>;       // 0..100 each
  sectionScores: Record<SectionId, number>;
  weakest: SectionId[];             // 3, worst first
  undecidedCount: number;
};

/** `report.ts` output — the prose layer, built from Result + questions.ts. */
type ReportModel = {
  result: Result;
  sections: SectionReport[];        // all 9, ordered by section number
};

type SectionReport = {
  id: SectionId;
  title: string;
  score: number;
  state: 'decided' | 'undecided' | 'mixed';
  findings: string[];               // copied verbatim from Question.findings
};
```

The split is deliberate. `score.ts` produces no prose at all, which makes its
tests pure arithmetic; `report.ts` is the only module that can put a sentence
in front of a reader, which makes it the only module the decision-3 guard test
has to police.

Note what `SectionReport` does not have: no `fix`, no `recommendation`, no
`nextStep`, no `severity` dressed up as urgency. Decision 3, made structural.

Verdict bands:

| Score | Verdict |
|---|---|
| 0–39 | `THIN WRAPPER` |
| 40–64 | `WRAPPER WITH FOUNDATIONS` |
| 65–84 | `REAL PRODUCT, THIN IN PLACES` |
| 85–100 | `REAL PRODUCT` |

Ties in `weakest` break by section number ascending, so the output is
deterministic — which is what makes it snapshot-testable.

## 6. Modules and data flow

```
src/lib/teardown/
  questions.ts   the 13 questions + 9 section titles. Data only, no logic.
  score.ts       (answers) -> Result. Pure.
  report.ts      (Result) -> ReportModel. Pure. The only prose layer.
  email.ts       (ReportModel, ...) -> HTML string. Pure.
  score.test.ts
  report.test.ts
  email.test.ts

src/components/teardown/
  Quiz.tsx       one question at a time, keyboard-navigable, progress rule
  Verdict.tsx    the ungated plate: score, band, four axis bars, 3 weakest
  Gate.tsx       email field + honeypot; submits, then reveals
  Report.tsx     the nine sections, rendered from ReportModel

src/pages/Teardown.tsx    route shell: Seo, intro, Quiz -> Verdict -> Gate -> Report
api/teardown-report.ts    POST { answers, email, hp } -> re-score -> Resend
```

Flow:

1. Page prerenders with the intro and question 1 visible in the HTML.
2. All 13 answers are held in React state. **No network traffic occurs until
   the email is submitted.** Abandoning the quiz sends us nothing, by design.
3. On the last answer, `score(answers)` runs in the browser and `Verdict`
   renders. Nothing is asked for.
4. `Gate` takes an email and POSTs `{ answers, email, hp }`.
5. The client reveals `Report` immediately on submit — it does not await the
   response (decision 6).
6. The function validates, re-runs `score` → `report` → `email`, sends via
   Resend, and adds the contact to the audience.

`api/teardown-report.ts` imports the pure modules by relative path
(`../src/lib/teardown/score`), not via the `@/` alias, which Vite resolves but
the function bundler does not. **This is the first thing to verify on a preview
deploy** — if the alias or the TS config bites, the fallback is to move
`src/lib/teardown/` to a root `lib/` shared by both, which costs one import
rewrite and nothing else.

## 7. Error handling

| Failure | Behaviour |
|---|---|
| POST rejected or network down | Report still renders. A quiet line under it: "Couldn't email a copy — it's all here." Never blocks. |
| Malformed payload | 400. Answers must be exactly 13 integers, each in range for its question; email must match a basic shape check. Nothing partial is accepted. |
| Honeypot field non-empty | 200 with no send. Bots get silence, not a signal. |
| Resend send fails | 502, logged. Client already showed the report, so the reader sees only the quiet line. |
| Resend audience add fails | Ignored. The send is the point; the list is a side effect and must not fail the request. |
| JS disabled | The prerendered intro, question 1 and a link to `/work-with-me` are all still readable. The quiz does not function; nothing is broken-looking. |

**Known limitation, accepted for v1:** the function sends to whatever address
it is given, so it is in principle a way to mail someone else a report they did
not ask for. Mitigations are the honeypot, the strict payload validation, and
Resend's own account rate limits. There is no per-IP throttle, because doing it
properly needs shared state we have deliberately not built. The blast radius is
one unsolicited, non-malicious email per request. If it is ever actually abused,
the fix is Vercel KV and a per-IP counter — a contained change to one file.

## 8. Testing

`vitest` runs in the `node` environment against `src/**/*.test.ts`, so the pure
modules are fully testable and the React components are not testable in this
harness. That split decides what gets automated.

Automated:

- `score.test.ts` — all-zeros → 0 and `THIN WRAPPER`; all-max → 100 and
  `REAL PRODUCT`; each band boundary at 39/40, 64/65, 84/85; axis scores are
  independent; `weakest` returns exactly 3, worst first, ties broken by section
  number; `undecidedCount` counts `unknown` options and nothing else.
- `report.test.ts` — every one of the 9 sections appears regardless of answers;
  `state` is `undecided` only when every answer in that section was `unknown`,
  `mixed` when some were.
- `email.test.ts` — the HTML contains all 9 section titles, the score, and one
  link to `/work-with-me`; it contains no `<script>`; the email is generated
  from `ReportModel` alone.
- **A guard test that every rendered finding string is `===` to an entry in
  `questions.ts`'s `findings` array.** This is decision 3's enforcement: a
  prescriptive sentence cannot enter the output without being authored into the
  question bank first, where it is reviewable.

Manual QA checklist (no DOM harness):

- Keyboard-only run: every option reachable, Enter advances, focus visible.
- `prefers-reduced-motion` respected on the progress rule.
- 360px viewport: no horizontal scroll on the axis bars.
- View source on the built page: intro and question 1 present in the HTML.
- One real end-to-end send to a real inbox; check the rendered email in Gmail
  and in Apple Mail, both appearances.

## 9. Design and integration

Built from `src/components/portfolio/tokens` on ink, exactly as
`WorkWithMe.tsx` is: no new stylesheet, no new fonts (Archivo and JetBrains
Mono are already in `index.html`), no new colours. `c.signal` stays reserved
for availability claims — a score is not a status light, so the axis bars use
`c.mark` and `c.dimOnInk`.

No `data-*` attributes. Those are the motion contract for
`usePortfolioMotion`, which mounts on the front page alone; hover and focus use
the CSS states (`pf-nudge`, `pf-outline`, `pf-underline`) that work without the
engine.

Wiring:

- `src/routes.tsx` — one record for `/teardown`, `lazy` like every other route.
- `src/pages/WorkWithMe.tsx` — one line above the offers pointing at the free
  test, framed as the rung below the $199, never as a sample of it.
- `src/content/drops/system.mdx` — a closing line linking the template to the
  scored version of itself.
- `scripts/generate-feeds.mjs` — confirm `/teardown` lands in the sitemap.

## 10. Environment

Two new secrets, set in Vercel, never committed:

- `RESEND_API_KEY`
- `RESEND_AUDIENCE_ID`

Plus a verified sending domain on Resend (SPF/DKIM on `anadithakur.in`).
The free tier covers 3,000 sends a month, which is far above any volume this
tool will produce in its first year.

If either variable is missing, the function returns 501 and logs it, rather
than throwing — so a preview deploy without secrets still serves the page and
the in-browser report, and only the email is absent.
