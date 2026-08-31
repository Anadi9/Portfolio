# The Wrapper Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a free, self-serve diagnostic at `/teardown` that scores a reader's own answers about their AI feature, shows the verdict ungated, and emails a nine-section written report in exchange for an address.

**Architecture:** All judgement lives in four pure TypeScript modules under `src/lib/teardown/` — a question bank, a scorer, a report builder, an email renderer. The React page is a thin shell over them and makes no network call until an email is submitted. One Vercel serverless function re-runs those same pure modules server-side from the raw answers and sends the report via Resend. No database, no LLM, no scraping.

**Tech Stack:** React 18 + TypeScript, `vite-react-ssg` (build-time prerender), inline styles from `src/components/portfolio/tokens`, Vitest (node environment), Vercel serverless functions, Resend.

**Spec:** `docs/superpowers/specs/2026-09-01-wrapper-test-design.md` — read it before starting. The plan argues from it and does not restate its reasoning.

## Global Constraints

- **Diagnose, never prescribe.** No output string anywhere may tell the reader what to do, what to build, or what to fix. `SectionReport` has no `fix`/`recommendation`/`nextStep`/`severity` field and must never gain one. Task 3 adds a guard test that enforces this.
- **Every finding string is authored in `questions.ts`.** No module may compose, template, or interpolate a finding sentence. Findings are copied verbatim.
- **13 questions, 4 options each.** Option index 3 is always the literal string `"I'm not sure"` with `weight: 0, unknown: true`.
- **Weights are `3 / 1 / 0 / 0`** in option order, for every question. Maximum raw score is 39.
- **Verdict bands:** 0–39 `THIN WRAPPER`, 40–64 `WRAPPER WITH FOUNDATIONS`, 65–84 `REAL PRODUCT, THIN IN PLACES`, 85–100 `REAL PRODUCT`.
- **Styling:** inline styles from `@/components/portfolio/tokens` only. No new stylesheet, no new fonts, no new colours, no Tailwind classes. `c.signal` and `c.signalOnInk` are forbidden — they are reserved for availability claims.
- **No `data-*` attributes.** They are the motion contract for `usePortfolioMotion`, which mounts on the front page alone. Use `pf-nudge`, `pf-outline`, `pf-underline` for hover/focus.
- **Tests are `src/**/*.test.ts` in the node environment.** No DOM, no React Testing Library. Components are verified by the manual QA checklist in Task 9.
- **Ties break by ascending section id** everywhere, so output is deterministic.

## Deviation from the spec

Spec §6 lists `report.ts` as `(Result) -> ReportModel`. It is implemented as `report(answers: number[]): ReportModel`, calling `score()` internally. Findings need the raw answers, so passing `Result` alone would force every caller to pass both and keep them in sync. The spec's actual intent — `score.ts` produces no prose, `report.ts` is the only prose layer — is preserved exactly.

---

## File Structure

**Create:**
- `src/lib/teardown/questions.ts` — 13 questions, 9 section titles, shared types. Data only, zero logic.
- `src/lib/teardown/questions.test.ts` — structural invariants of the bank.
- `src/lib/teardown/score.ts` — `score()`, `band()`, `isValidAnswers()`. Pure arithmetic, no prose.
- `src/lib/teardown/score.test.ts`
- `src/lib/teardown/report.ts` — `report()`. The only prose layer.
- `src/lib/teardown/report.test.ts` — includes the decision-3 guard test.
- `src/lib/teardown/email.ts` — `renderEmail()`. `ReportModel` → subject + HTML.
- `src/lib/teardown/email.test.ts`
- `src/components/teardown/Quiz.tsx` — one question at a time, keyboard-navigable.
- `src/components/teardown/Verdict.tsx` — the ungated plate.
- `src/components/teardown/Gate.tsx` — email field + honeypot.
- `src/components/teardown/Report.tsx` — the nine sections.
- `src/pages/Teardown.tsx` — route shell: header, Seo, intro, and the state machine.
- `api/teardown-report.ts` — the serverless function.

**Modify:**
- `src/routes.tsx` — one route record for `/teardown`.
- `src/pages/WorkWithMe.tsx` — one link to the free tool above the offers.
- `src/content/drops/system.mdx` — closing link to the scored version of the template.
- `scripts/generate-feeds.mjs:47-51` — add `/teardown` to the sitemap.
- `tsconfig.node.json:22` — include `api` so the function typechecks.
- `package.json` — add `resend` and `@vercel/node`.

---

## Task 1: The question bank

The content of the product. Everything downstream is arithmetic over this file.

**Files:**
- Create: `src/lib/teardown/questions.ts`
- Test: `src/lib/teardown/questions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Axis`, `type SectionId`, `type Option`, `type Question`, `const QUESTIONS: Question[]` (length 13), `const SECTIONS: Record<SectionId, string>`, `const MAX_RAW = 39`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/teardown/questions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_RAW, QUESTIONS, SECTIONS } from './questions';

describe('question bank — shape', () => {
  it('has exactly 13 questions', () => {
    expect(QUESTIONS).toHaveLength(13);
  });

  it('gives every question 4 options with findings parallel to them', () => {
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.findings).toHaveLength(4);
    }
  });

  it("ends every question with a single unknown option labelled \"I'm not sure\"", () => {
    for (const q of QUESTIONS) {
      const unknowns = q.options.filter((o) => o.unknown);
      expect(unknowns).toHaveLength(1);
      expect(q.options[3].unknown).toBe(true);
      expect(q.options[3].label).toBe("I'm not sure");
      expect(q.options[3].weight).toBe(0);
    }
  });

  it('weights every question 3 / 1 / 0 / 0', () => {
    for (const q of QUESTIONS) {
      expect(q.options.map((o) => o.weight)).toEqual([3, 1, 0, 0]);
    }
  });

  it('sums to a maximum raw score of 39', () => {
    const max = QUESTIONS.reduce((n, q) => n + Math.max(...q.options.map((o) => o.weight)), 0);
    expect(max).toBe(MAX_RAW);
    expect(MAX_RAW).toBe(39);
  });

  it('gives every question a unique id', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(13);
  });
});

describe('question bank — coverage', () => {
  it('covers all nine sections', () => {
    expect(new Set(QUESTIONS.map((q) => q.section))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(Object.keys(SECTIONS)).toHaveLength(9);
  });

  it('covers all four axes', () => {
    expect(new Set(QUESTIONS.map((q) => q.axis))).toEqual(
      new Set(['defensibility', 'failure', 'cost', 'evaluation']),
    );
  });

  it('distributes questions per axis as 4 / 3 / 3 / 3', () => {
    const count = (a: string) => QUESTIONS.filter((q) => q.axis === a).length;
    expect(count('defensibility')).toBe(4);
    expect(count('failure')).toBe(3);
    expect(count('cost')).toBe(3);
    expect(count('evaluation')).toBe(3);
  });
});

describe('question bank — no prescriptions', () => {
  // Decision 3 of the spec, checked at the source. A finding observes; it never
  // instructs. These are the verbs that turn an observation into advice.
  const PRESCRIPTIVE = /\b(you should|you need to|make sure|consider|try|start by|we recommend|fix|add a|build a)\b/i;

  it('has no finding that tells the reader what to do', () => {
    for (const q of QUESTIONS) {
      for (const f of q.findings) {
        expect(f, `${q.id}: ${f}`).not.toMatch(PRESCRIPTIVE);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/teardown/questions.test.ts`
Expected: FAIL — `Failed to resolve import "./questions"`.

- [ ] **Step 3: Write the question bank**

Create `src/lib/teardown/questions.ts`:

```ts
/**
 * The Wrapper Test question bank — the content of the free teardown.
 *
 * Everything downstream of this file is arithmetic. The judgement lives here,
 * in the option weights and in `findings`, and `findings` is the ONLY place a
 * sentence may be written that a reader will ever see. `report.ts` copies them
 * verbatim; nothing composes, templates or interpolates one.
 *
 * That constraint is what keeps the free tool diagnostic. A finding names what
 * an answer indicates and stops there — the fix is what the paid teardown is
 * for, and there is deliberately no field on this type to put one in.
 *
 * Weights are 3 / 1 / 0 / 0 for every question, so the fourth option (always a
 * literal "I'm not sure") scores the same as the worst real answer while
 * staying distinguishable from it. `drops/system` makes the argument for why
 * that distinction matters: an honest unknown is worth more than a guess
 * dressed up as a fact, and the report tells them apart.
 */

export type Axis = 'defensibility' | 'failure' | 'cost' | 'evaluation';
export type SectionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Option = {
  label: string;
  weight: 0 | 1 | 2 | 3;
  /** Set on the fourth option of every question. Scores 0, reported separately. */
  unknown?: true;
};

export type Question = {
  id: string;
  section: SectionId;
  axis: Axis;
  prompt: string;
  options: Option[];
  /** Parallel to `options`. Observation only — see the file comment. */
  findings: string[];
};

/** Section titles, verbatim from `src/content/drops/system.mdx`. */
export const SECTIONS: Record<SectionId, string> = {
  1: 'Problem statement',
  2: 'Requirements',
  3: 'Constraints',
  4: 'Architecture',
  5: 'Data model',
  6: 'API contract',
  7: 'Failure modes',
  8: 'Tradeoffs',
  9: 'Open questions',
};

/** Highest achievable raw score: 13 questions × 3. */
export const MAX_RAW = 39;

const UNKNOWN: Option = { label: "I'm not sure", weight: 0, unknown: true };

export const QUESTIONS: Question[] = [
  {
    id: 'problem-without-the-model',
    section: 1,
    axis: 'defensibility',
    prompt:
      "Could you state what your product does in one sentence, without using the words 'AI', 'GPT' or 'Claude'?",
    options: [
      { label: 'Yes — and the sentence is about an outcome, not a technology', weight: 3 },
      { label: "Yes, but the sentence is basically 'it uses AI to do X'", weight: 1 },
      { label: 'Not really — the product is the AI part', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'The problem statement survives the removal of the model. This product is defined by what it delivers, not by what it calls.',
      'The one-sentence description leans on the model as the differentiator. That sentence describes a capability the model vendor also has.',
      'The product and the model are the same object here. There is no statement of the problem that stands independently of the tool being used to solve it.',
      'The problem statement has not been written down. Every section below inherits that.',
    ],
  },
  {
    id: 'good-enough-to-ship',
    section: 2,
    axis: 'evaluation',
    prompt: 'How do you decide an output is good enough to put in front of a user?',
    options: [
      { label: 'A written eval set with a pass threshold, run before release', weight: 3 },
      { label: 'A handful of test prompts someone checks by eye', weight: 1 },
      { label: 'We ship and watch for complaints', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Quality is a measured property with a threshold attached. Regressions become visible before users find them.',
      'Quality is spot-checked rather than measured. The check catches obvious breakage and very little that is subtler.',
      'Quality is defined by user complaints, which sets the floor at whatever people will tolerate before they leave quietly.',
      "No definition of 'good enough' exists, so there is nothing to hold a release against.",
    ],
  },
  {
    id: 'cost-per-user',
    section: 3,
    axis: 'cost',
    prompt: 'Do you know what one active user costs you in model spend per month?',
    options: [
      { label: "Yes, to within a rough range, and it's tracked", weight: 3 },
      { label: 'I know the total bill but not the per-user number', weight: 1 },
      { label: 'No — we look at the invoice when it arrives', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Unit cost is a known number, which makes pricing and margin decisions rather than surprises.',
      'Spend is visible in aggregate only. A heavy user and a light one are indistinguishable until the bill moves.',
      'Model spend is discovered after the fact. There is no figure to price against and no threshold to alert on.',
      'Per-user cost has not been established, so the economics of growth are untested.',
    ],
  },
  {
    id: 'survives-the-vendor',
    section: 4,
    axis: 'defensibility',
    prompt: 'If your model vendor shipped your core feature natively next month, what would still be yours?',
    options: [
      { label: "Proprietary data, workflow or integrations they don't have", weight: 3 },
      { label: 'Our interface and our onboarding', weight: 1 },
      { label: 'Honestly, not much', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'There is an asset that does not arrive with the model. That asset is the product.',
      'The defensible surface is presentation. It is real, and it is also the cheapest layer for a competitor to reproduce.',
      "The product's value is the model's value routed through a different interface. A native feature removes the reason to use it.",
      'The question of what survives the vendor has not been asked.',
    ],
  },
  {
    id: 'timeout-path',
    section: 4,
    axis: 'failure',
    prompt: 'What happens in your product when a model call times out or errors?',
    options: [
      { label: 'A defined fallback path returns a degraded but useful result', weight: 3 },
      { label: 'We retry, then show a friendly error', weight: 1 },
      { label: 'The error surfaces as-is, or the request just hangs', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Failure has a designed destination. The user gets less product, not no product.',
      'Failure is caught but has no floor beneath it. A slow day and a total outage look identical from the user side.',
      "Failure is unhandled. The worst version of this product is whatever the model gives on a bad day.",
      'The timeout path has not been walked. Whatever it does now, nobody chose it.',
    ],
  },
  {
    id: 'what-accumulates',
    section: 5,
    axis: 'defensibility',
    prompt: 'What do you store from each interaction?',
    options: [
      { label: 'Structured records we could evaluate, tune or build features on', weight: 3 },
      { label: 'Raw logs, kept in case we need them', weight: 1 },
      { label: 'Nothing beyond what the user sees', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Usage accumulates into an asset. The product improves with volume in a way a competitor starting today cannot shortcut.',
      'History exists but is not shaped for use. It stays a cost centre until somebody does the work that turns it into a dataset.',
      'Every interaction is discarded. The product on day 500 knows exactly what it knew on day one.',
      'What is retained has not been decided, which usually means a framework default decided it.',
    ],
  },
  {
    id: 'malformed-output',
    section: 6,
    axis: 'failure',
    prompt: 'When the model returns something malformed, what catches it?',
    options: [
      { label: 'Schema validation, with defined behaviour when validation fails', weight: 3 },
      { label: 'We parse defensively and hope', weight: 1 },
      { label: 'It goes straight through to the user or the next system', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'The boundary between the model and the rest of the system is enforced. Malformed output is a handled case, not an incident.',
      'The boundary is guarded by convention rather than by a contract. It holds until an output shape nobody anticipated arrives.',
      "There is no boundary. The model's worst output is the product's output.",
      'The malformed-output path has not been specified.',
    ],
  },
  {
    id: 'worst-failure-written-down',
    section: 7,
    axis: 'failure',
    prompt: 'The failure of your AI feature that would hurt a user most — is it written down anywhere?',
    options: [
      { label: 'Written down, with the mitigation named beside it', weight: 3 },
      { label: "We've talked about it but never written it down", weight: 1 },
      { label: "We haven't gone through that", weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Failure modes are enumerated, which is the only condition under which they can be designed for.',
      'The failure modes live in conversation and memory. They survive exactly as long as the people who discussed them do.',
      'Failure modes are undiscovered. The first enumeration will be written by a user.',
      'No failure analysis exists to consult.',
    ],
  },
  {
    id: 'spend-ceiling',
    section: 7,
    axis: 'cost',
    prompt: 'Is there a cap on what a single user or a single request can cost you?',
    options: [
      { label: 'Yes — hard limits per request and per account', weight: 3 },
      { label: 'Rate limiting, but no spend cap', weight: 1 },
      { label: 'No caps', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'The maximum bad day has a ceiling. A runaway loop or a determined abuser costs a known amount.',
      'Throughput is bounded; spend is not. A slow, expensive usage pattern passes the rate limiter untouched.',
      "There is no ceiling on a single actor's cost. The invoice is the only limiter, and it arrives late.",
      'Whether spend is capped has not been established.',
    ],
  },
  {
    id: 'why-this-model',
    section: 8,
    axis: 'cost',
    prompt: "Why are you on the model you're on?",
    options: [
      { label: 'A deliberate comparison, with the reason written down', weight: 3 },
      { label: "It's what we started with and it works", weight: 1 },
      { label: "It's the one everyone uses", weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'The model is a decision with a recorded rationale, which is what lets it be revisited when prices or capabilities move.',
      'The model is an inheritance. Switching cost is unknown because nobody has priced the alternative.',
      'The choice was made by default. The rationale, if challenged, would have to be reconstructed after the fact.',
      'The reason for the current model is not recorded anywhere.',
    ],
  },
  {
    id: 'deliberately-not-built',
    section: 8,
    axis: 'defensibility',
    prompt: 'What did you deliberately decide not to build?',
    options: [
      { label: 'There is a list, with the reasons', weight: 3 },
      { label: 'I could name one or two things', weight: 1 },
      { label: 'We build whatever comes up', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Scope is a series of decisions. What is absent is absent on purpose, which is what makes the roadmap arguable.',
      'Some scope was decided and most of it accumulated. The boundary of the product is partly discovered rather than drawn.',
      "There is no scope boundary. The product's shape is set by the most recent request.",
      'No record of what was excluded, which usually means nothing was.',
    ],
  },
  {
    id: 'biggest-unknown',
    section: 9,
    axis: 'evaluation',
    prompt: "What's the biggest thing you don't know about your own product right now?",
    options: [
      { label: "I can name it, and it's tracked somewhere", weight: 3 },
      { label: "I can name it, but it's only in my head", weight: 1 },
      { label: 'Nothing comes to mind', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'The unknown is held explicitly, which is the condition for ever resolving it.',
      'The unknown is identified but unrecorded. It competes for attention with everything else in one person’s memory.',
      'No open questions is rarely a sign of a settled design. More often it is a sign that nobody has looked recently.',
      'The open questions have not been surfaced.',
    ],
  },
  {
    id: 'last-number-led-change',
    section: 9,
    axis: 'evaluation',
    prompt: 'When did you last change something because a number told you to, rather than because it felt right?',
    options: [
      { label: 'Within the last month', weight: 3 },
      { label: "At some point, but I'd have to think about when", weight: 1 },
      { label: 'We go on judgement', weight: 0 },
      UNKNOWN,
    ],
    findings: [
      'Decisions are being fed by measurement. There is a loop, and it is closing.',
      'Measurement influences decisions occasionally. The loop exists but is not load-bearing.',
      'The product changes on instinct alone. Instinct is fast, and it is unfalsifiable.',
      'Whether measurement drives decisions is itself unknown.',
    ],
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/teardown/questions.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/teardown/questions.ts src/lib/teardown/questions.test.ts
git commit -m "feat(teardown): the Wrapper Test question bank"
```

---

## Task 2: Scoring

Pure arithmetic over the bank. No prose crosses this module's boundary.

**Files:**
- Create: `src/lib/teardown/score.ts`
- Test: `src/lib/teardown/score.test.ts`

**Interfaces:**
- Consumes: `QUESTIONS`, `SECTIONS`, `MAX_RAW`, `Axis`, `SectionId` from `./questions`.
- Produces:
  - `type VerdictBand = 'THIN WRAPPER' | 'WRAPPER WITH FOUNDATIONS' | 'REAL PRODUCT, THIN IN PLACES' | 'REAL PRODUCT'`
  - `type Result = { score: number; verdict: VerdictBand; axes: Record<Axis, number>; sectionScores: Record<SectionId, number>; weakest: SectionId[]; undecidedCount: number }`
  - `band(score: number): VerdictBand`
  - `isValidAnswers(value: unknown): value is number[]`
  - `score(answers: number[]): Result`

- [ ] **Step 1: Write the failing test**

Create `src/lib/teardown/score.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { band, isValidAnswers, score } from './score';

/** 13 answers, all at the given option index. */
const all = (i: number) => QUESTIONS.map(() => i);

describe('band', () => {
  it('places every boundary exactly', () => {
    expect(band(0)).toBe('THIN WRAPPER');
    expect(band(39)).toBe('THIN WRAPPER');
    expect(band(40)).toBe('WRAPPER WITH FOUNDATIONS');
    expect(band(64)).toBe('WRAPPER WITH FOUNDATIONS');
    expect(band(65)).toBe('REAL PRODUCT, THIN IN PLACES');
    expect(band(84)).toBe('REAL PRODUCT, THIN IN PLACES');
    expect(band(85)).toBe('REAL PRODUCT');
    expect(band(100)).toBe('REAL PRODUCT');
  });
});

describe('score — extremes', () => {
  it('scores a perfect run 100 and REAL PRODUCT', () => {
    const r = score(all(0));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('REAL PRODUCT');
    expect(Object.values(r.axes)).toEqual([100, 100, 100, 100]);
    expect(r.undecidedCount).toBe(0);
  });

  it('scores the worst run 0 and THIN WRAPPER', () => {
    const r = score(all(2));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('THIN WRAPPER');
    expect(r.undecidedCount).toBe(0);
  });

  it('scores an all-unknown run 0 but counts all 13 as undecided', () => {
    const r = score(all(3));
    expect(r.score).toBe(0);
    expect(r.undecidedCount).toBe(13);
  });
});

describe('score — axes are independent', () => {
  it('drops only the axis whose questions were answered badly', () => {
    // Answer every `cost` question at index 2 (weight 0), everything else at 0 (weight 3).
    const answers = QUESTIONS.map((q) => (q.axis === 'cost' ? 2 : 0));
    const r = score(answers);
    expect(r.axes.cost).toBe(0);
    expect(r.axes.defensibility).toBe(100);
    expect(r.axes.failure).toBe(100);
    expect(r.axes.evaluation).toBe(100);
  });
});

describe('score — weakest', () => {
  it('returns exactly three sections, worst first', () => {
    const r = score(all(0));
    expect(r.weakest).toHaveLength(3);
  });

  it('breaks ties by ascending section id, so output is deterministic', () => {
    // Every section scores 100 — the tie-break alone decides the order.
    expect(score(all(0)).weakest).toEqual([1, 2, 3]);
  });

  it('puts a genuinely weak section first regardless of id', () => {
    // Section 9 is questions 12 and 13; answer both at index 2 (weight 0).
    const answers = QUESTIONS.map((q) => (q.section === 9 ? 2 : 0));
    const r = score(answers);
    expect(r.weakest[0]).toBe(9);
    expect(r.sectionScores[9]).toBe(0);
  });
});

describe('isValidAnswers', () => {
  it('accepts exactly 13 in-range integers', () => {
    expect(isValidAnswers(all(0))).toBe(true);
    expect(isValidAnswers(all(3))).toBe(true);
  });

  it('rejects the wrong length', () => {
    expect(isValidAnswers(all(0).slice(0, 12))).toBe(false);
    expect(isValidAnswers([...all(0), 0])).toBe(false);
  });

  it('rejects out-of-range, non-integer and non-numeric entries', () => {
    expect(isValidAnswers(all(4))).toBe(false);
    expect(isValidAnswers(all(-1))).toBe(false);
    expect(isValidAnswers(QUESTIONS.map(() => 1.5))).toBe(false);
    expect(isValidAnswers(QUESTIONS.map(() => '0'))).toBe(false);
  });

  it('rejects anything that is not an array', () => {
    expect(isValidAnswers(null)).toBe(false);
    expect(isValidAnswers(undefined)).toBe(false);
    expect(isValidAnswers({ 0: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/teardown/score.test.ts`
Expected: FAIL — `Failed to resolve import "./score"`.

- [ ] **Step 3: Write the scorer**

Create `src/lib/teardown/score.ts`:

```ts
import { MAX_RAW, QUESTIONS, type Axis, type SectionId } from './questions';

/**
 * Scoring — arithmetic only.
 *
 * Nothing in this module returns a sentence. That is deliberate: it makes the
 * tests pure numbers, and it leaves `report.ts` as the single place a finding
 * can reach a reader, which is the one place the no-prescriptions guard has to
 * watch.
 */

export type VerdictBand =
  | 'THIN WRAPPER'
  | 'WRAPPER WITH FOUNDATIONS'
  | 'REAL PRODUCT, THIN IN PLACES'
  | 'REAL PRODUCT';

export type Result = {
  /** 0..100. */
  score: number;
  verdict: VerdictBand;
  axes: Record<Axis, number>;
  sectionScores: Record<SectionId, number>;
  /** Three section ids, worst first, ties broken by ascending id. */
  weakest: SectionId[];
  undecidedCount: number;
};

const pct = (got: number, max: number) => (max === 0 ? 0 : Math.round((got / max) * 100));

export const band = (score: number): VerdictBand =>
  score >= 85
    ? 'REAL PRODUCT'
    : score >= 65
      ? 'REAL PRODUCT, THIN IN PLACES'
      : score >= 40
        ? 'WRAPPER WITH FOUNDATIONS'
        : 'THIN WRAPPER';

/**
 * The only validation the serverless function needs. Answers are the entire
 * wire format, so an exhaustive check here is an exhaustive check of the
 * payload — which is why the body carries answers and not a scored report.
 */
export const isValidAnswers = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === QUESTIONS.length &&
  value.every(
    (v, i) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < QUESTIONS[i].options.length,
  );

export function score(answers: number[]): Result {
  const axisGot: Record<Axis, number> = { defensibility: 0, failure: 0, cost: 0, evaluation: 0 };
  const axisMax: Record<Axis, number> = { defensibility: 0, failure: 0, cost: 0, evaluation: 0 };
  const sectionGot = {} as Record<SectionId, number>;
  const sectionMax = {} as Record<SectionId, number>;

  let raw = 0;
  let undecidedCount = 0;

  QUESTIONS.forEach((q, i) => {
    const option = q.options[answers[i]];
    const weight = option.weight;

    raw += weight;
    if (option.unknown) undecidedCount += 1;

    axisGot[q.axis] += weight;
    axisMax[q.axis] += 3;
    sectionGot[q.section] = (sectionGot[q.section] ?? 0) + weight;
    sectionMax[q.section] = (sectionMax[q.section] ?? 0) + 3;
  });

  const axes = {
    defensibility: pct(axisGot.defensibility, axisMax.defensibility),
    failure: pct(axisGot.failure, axisMax.failure),
    cost: pct(axisGot.cost, axisMax.cost),
    evaluation: pct(axisGot.evaluation, axisMax.evaluation),
  };

  const sectionScores = {} as Record<SectionId, number>;
  for (const key of Object.keys(sectionGot)) {
    const id = Number(key) as SectionId;
    sectionScores[id] = pct(sectionGot[id], sectionMax[id]);
  }

  // Ascending id is the tie-break, and `sort` is stable, so sorting the already
  // ascending id list by score alone gives it for free.
  const weakest = (Object.keys(sectionScores) as unknown as string[])
    .map((k) => Number(k) as SectionId)
    .sort((a, b) => a - b)
    .sort((a, b) => sectionScores[a] - sectionScores[b])
    .slice(0, 3);

  const total = pct(raw, MAX_RAW);

  return { score: total, verdict: band(total), axes, sectionScores, weakest, undecidedCount };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/teardown/score.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/teardown/score.ts src/lib/teardown/score.test.ts
git commit -m "feat(teardown): score answers into a verdict, axes and weakest sections"
```

---

## Task 3: The report model

The only prose layer, and therefore the only place the no-prescriptions rule has to be enforced at runtime.

**Files:**
- Create: `src/lib/teardown/report.ts`
- Test: `src/lib/teardown/report.test.ts`

**Interfaces:**
- Consumes: `QUESTIONS`, `SECTIONS`, `SectionId` from `./questions`; `score`, `type Result` from `./score`.
- Produces:
  - `type SectionState = 'decided' | 'undecided' | 'mixed'`
  - `type SectionReport = { id: SectionId; title: string; score: number; state: SectionState; findings: string[] }`
  - `type ReportModel = { result: Result; sections: SectionReport[] }`
  - `report(answers: number[]): ReportModel`

- [ ] **Step 1: Write the failing test**

Create `src/lib/teardown/report.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS } from './questions';
import { report } from './report';

const all = (i: number) => QUESTIONS.map(() => i);

describe('report — completeness', () => {
  it('always returns all nine sections in ascending order', () => {
    for (const i of [0, 1, 2, 3]) {
      const m = report(all(i));
      expect(m.sections.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('titles every section from SECTIONS', () => {
    for (const s of report(all(0)).sections) {
      expect(s.title).toBe(SECTIONS[s.id]);
    }
  });

  it('carries the full Result alongside the sections', () => {
    const m = report(all(0));
    expect(m.result.score).toBe(100);
    expect(m.result.verdict).toBe('REAL PRODUCT');
  });

  it('gives each section one finding per question in that section', () => {
    const m = report(all(0));
    const bySection = (id: number) => QUESTIONS.filter((q) => q.section === id).length;
    for (const s of m.sections) {
      expect(s.findings).toHaveLength(bySection(s.id));
    }
  });
});

describe('report — decided / undecided / mixed', () => {
  it('marks every section undecided when every answer is unknown', () => {
    for (const s of report(all(3)).sections) {
      expect(s.state).toBe('undecided');
    }
  });

  it('marks every section decided when no answer is unknown', () => {
    for (const s of report(all(2)).sections) {
      expect(s.state).toBe('decided');
    }
  });

  it('marks a multi-question section mixed when only some answers are unknown', () => {
    // Section 4 is questions 4 and 5 (indices 3 and 4). Unknown one, answer the other.
    const answers = QUESTIONS.map((_, i) => (i === 3 ? 3 : 0));
    const s4 = report(answers).sections.find((s) => s.id === 4);
    expect(s4?.state).toBe('mixed');
  });

  it('never marks a single-question section mixed', () => {
    const answers = QUESTIONS.map((q, i) => (q.section === 1 ? 3 : 0));
    const s1 = report(answers).sections.find((s) => s.id === 1);
    expect(s1?.state).toBe('undecided');
  });
});

describe('report — decision 3: diagnose, never prescribe', () => {
  it('has no field on a section that could hold a fix', () => {
    const s = report(all(0)).sections[0];
    const keys = Object.keys(s).sort();
    expect(keys).toEqual(['findings', 'id', 'score', 'state', 'title']);
  });

  it('renders no finding that was not authored in questions.ts', () => {
    // The guard. A sentence cannot reach a reader without first being written
    // into the question bank, where it is reviewable.
    const authored = new Set(QUESTIONS.flatMap((q) => q.findings));
    for (const i of [0, 1, 2, 3]) {
      for (const s of report(all(i)).sections) {
        for (const f of s.findings) {
          expect(authored.has(f), `unauthored finding: ${f}`).toBe(true);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/teardown/report.test.ts`
Expected: FAIL — `Failed to resolve import "./report"`.

- [ ] **Step 3: Write the report builder**

Create `src/lib/teardown/report.ts`:

```ts
import { QUESTIONS, SECTIONS, type SectionId } from './questions';
import { score, type Result } from './score';

/**
 * The prose layer, and the only one.
 *
 * Findings are copied out of the question bank by index. Nothing here composes,
 * templates or interpolates a sentence, which is what lets `report.test.ts`
 * assert that every string a reader sees was authored in a reviewable file.
 *
 * `SectionReport` has no `fix`, `recommendation`, `nextStep` or `severity`.
 * That absence is the product decision, not an oversight: the free tool names
 * where you are thin and stops, because the fix is what the paid teardown is.
 * A test asserts the exact key set, so adding one fails the build.
 *
 * Takes raw answers rather than a `Result` — findings need the answers, and
 * threading both through every caller would be two things to keep in sync.
 */

export type SectionState = 'decided' | 'undecided' | 'mixed';

export type SectionReport = {
  id: SectionId;
  title: string;
  score: number;
  state: SectionState;
  findings: string[];
};

export type ReportModel = {
  result: Result;
  sections: SectionReport[];
};

const SECTION_IDS: SectionId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function report(answers: number[]): ReportModel {
  const result = score(answers);

  const sections = SECTION_IDS.map((id): SectionReport => {
    const indices = QUESTIONS.map((q, i) => (q.section === id ? i : -1)).filter((i) => i >= 0);
    const unknowns = indices.filter((i) => QUESTIONS[i].options[answers[i]].unknown).length;

    const state: SectionState =
      unknowns === 0 ? 'decided' : unknowns === indices.length ? 'undecided' : 'mixed';

    return {
      id,
      title: SECTIONS[id],
      score: result.sectionScores[id],
      state,
      findings: indices.map((i) => QUESTIONS[i].findings[answers[i]]),
    };
  });

  return { result, sections };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/teardown/report.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/teardown/report.ts src/lib/teardown/report.test.ts
git commit -m "feat(teardown): build the nine-section report model"
```

---

## Task 4: The email renderer

**Files:**
- Create: `src/lib/teardown/email.ts`
- Test: `src/lib/teardown/email.test.ts`

**Interfaces:**
- Consumes: `type ReportModel` from `./report`; `SECTIONS` from `./questions`.
- Produces: `renderEmail(model: ReportModel): { subject: string; html: string }`, `const ORIGIN = 'https://anadithakur.in'`.

**Note on email HTML:** email clients strip `<style>` blocks unpredictably and support no CSS variables, so every rule is inlined on the element. This is the one place in the repo where inline styles are a constraint rather than a convention. Colours are hard-coded hex copies of the token values, because `tokens.ts` exports React `CSSProperties`, not strings, and an email cannot consume it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/teardown/email.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS } from './questions';
import { report } from './report';
import { renderEmail } from './email';

const all = (i: number) => QUESTIONS.map(() => i);

describe('renderEmail — subject', () => {
  it('carries the verdict and the score', () => {
    const { subject } = renderEmail(report(all(0)));
    expect(subject).toContain('REAL PRODUCT');
    expect(subject).toContain('100');
  });

  it('differs by band', () => {
    const a = renderEmail(report(all(0))).subject;
    const b = renderEmail(report(all(2))).subject;
    expect(a).not.toBe(b);
  });
});

describe('renderEmail — body', () => {
  const { html } = renderEmail(report(all(1)));

  it('contains all nine section titles', () => {
    for (const title of Object.values(SECTIONS)) {
      expect(html).toContain(title);
    }
  });

  it('contains every finding for the given answers', () => {
    for (const q of QUESTIONS) {
      expect(html).toContain(q.findings[1]);
    }
  });

  it('links to the paid teardown exactly once', () => {
    const matches = html.match(/https:\/\/anadithakur\.in\/work-with-me/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('contains no script tag', () => {
    expect(html).not.toMatch(/<script/i);
  });

  it('escapes any HTML-significant character in a finding', () => {
    // No finding should be able to break the document even if one gains a
    // bracket or ampersand later.
    expect(html).not.toMatch(/<(?!!|\/?(html|head|body|meta|title|div|p|h1|h2|h3|span|a|table|tr|td|strong|hr)\b)/i);
  });
});

describe('renderEmail — undecided', () => {
  it('marks an all-unknown run as undecided rather than as a low score alone', () => {
    const { html } = renderEmail(report(all(3)));
    expect(html.toLowerCase()).toContain('not decided yet');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/teardown/email.test.ts`
Expected: FAIL — `Failed to resolve import "./email"`.

- [ ] **Step 3: Write the renderer**

Create `src/lib/teardown/email.ts`:

```ts
import type { ReportModel, SectionReport } from './report';

/**
 * The emailed report.
 *
 * Every rule is inlined on its element: email clients strip `<style>` blocks
 * unpredictably and support neither CSS variables nor `@media`. The hex values
 * are hand copies of `tokens.ts` — that module exports React `CSSProperties`
 * objects, which an email string cannot consume.
 *
 * Like every other module downstream of the question bank, this one only ever
 * copies findings. It states what was found and links to the paid teardown
 * once, at the end. It does not tell anyone what to do.
 */

export const ORIGIN = 'https://anadithakur.in';

const INK = '#0a0a0a';
const CREAM = '#E4DED0';
const GOLD = '#C9A24B';
const DIM = '#9a9a9a';
const RULE = '#2a2a2a';

/** Findings are authored, not user input — but escaping costs nothing and means
 *  a bracket added to a finding later cannot break the document. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STATE_LABEL: Record<SectionReport['state'], string> = {
  decided: 'Decided',
  undecided: 'Not decided yet',
  mixed: 'Partly decided',
};

const sectionBlock = (s: SectionReport) => `
      <tr>
        <td style="padding:24px 0;border-top:1px solid ${RULE};">
          <p style="margin:0 0 6px;font:700 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">
            ${s.id}. ${esc(s.title)}
          </p>
          <p style="margin:0 0 14px;font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;color:${DIM};">
            ${esc(STATE_LABEL[s.state])} &middot; ${s.score}/100
          </p>
          ${s.findings
            .map(
              (f) =>
                `<p style="margin:0 0 10px;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:#e4e4e4;">${esc(f)}</p>`,
            )
            .join('\n          ')}
        </td>
      </tr>`;

export function renderEmail(model: ReportModel): { subject: string; html: string } {
  const { result, sections } = model;

  const subject = `Your Wrapper Test: ${result.verdict} — ${result.score}/100`;

  const undecidedLine =
    result.undecidedCount > 0
      ? `<p style="margin:14px 0 0;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${DIM};">
             ${result.undecidedCount} of 13 answers were "I'm not sure". Those are recorded separately from low
             scores, because an undecided question and a badly decided one are different problems.
           </p>`
      : '';

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
  <body style="margin:0;padding:0;background:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td style="padding-bottom:28px;">
                <p style="margin:0 0 10px;font:700 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:${GOLD};">
                  THE WRAPPER TEST
                </p>
                <h1 style="margin:0;font:700 34px/1.1 Helvetica,Arial,sans-serif;text-transform:uppercase;color:${CREAM};">
                  ${esc(result.verdict)}
                </h1>
                <p style="margin:10px 0 0;font:700 15px/1.4 Helvetica,Arial,sans-serif;color:#ffffff;">
                  ${result.score}/100
                </p>
                ${undecidedLine}
              </td>
            </tr>
            ${sections.map(sectionBlock).join('')}
            <tr>
              <td style="padding:28px 0 0;border-top:1px solid ${RULE};">
                <p style="margin:0 0 18px;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${DIM};">
                  That is what the answers show. What to change first, in what order, and what it costs to
                  get wrong is the recorded teardown.
                </p>
                <a href="${ORIGIN}/work-with-me"
                   style="display:inline-block;padding:16px 20px;background:${CREAM};color:${INK};font:700 11px/1 Helvetica,Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">
                  See the teardown
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/teardown/email.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite and commit**

```bash
npm test
git add src/lib/teardown/email.ts src/lib/teardown/email.test.ts
git commit -m "feat(teardown): render the emailed report"
```

---

## Task 5: The quiz component

First UI task. No automated tests are possible — vitest runs in the node environment with no DOM (`vitest.config.ts:15`). Verification is the manual checklist at the end of this task.

**Files:**
- Create: `src/components/teardown/Quiz.tsx`

**Interfaces:**
- Consumes: `QUESTIONS` from `@/lib/teardown/questions`; tokens from `@/components/portfolio/tokens`.
- Produces: `export default function Quiz({ answers, onAnswer }: { answers: (number | null)[]; onAnswer: (questionIndex: number, optionIndex: number) => void })`. Renders the first unanswered question; the parent owns all state.

- [ ] **Step 1: Write the component**

Create `src/components/teardown/Quiz.tsx`:

```tsx
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { QUESTIONS } from '@/lib/teardown/questions';

/**
 * One question at a time, on ink.
 *
 * The parent owns the answers array, which is what makes the whole quiz
 * replayable and what keeps this component free of effects. `current` is the
 * first unanswered index, so answering advances and the Back button rewinds by
 * clearing — there is no separate cursor to drift out of step with the data.
 *
 * Options are real `<button>`s inside a `<fieldset>`: native focus, native
 * Enter and Space, and a legend a screen reader announces as the group's name.
 * No `data-*` attributes here — `usePortfolioMotion` mounts on the front page
 * alone, so anything marked for it would simply never animate.
 */

const optionStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left' as const,
  padding: px(s[5], s[5]),
  background: 'transparent',
  border: `${rule.base}px solid ${c.ruleSoft}`,
  color: '#fff',
  font: `400 15px/1.45 ${display}`,
  cursor: 'pointer',
} as const;

export default function Quiz({
  answers,
  onAnswer,
}: {
  answers: (number | null)[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
}) {
  const current = answers.findIndex((a) => a === null);
  if (current === -1) return null;

  const q = QUESTIONS[current];
  const done = current;
  const pct = Math.round((done / QUESTIONS.length) * 100);

  return (
    <div style={{ maxWidth: '52ch' }}>
      {/* Progress: a rule that fills, not a widget. Same hairline as everywhere else. */}
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={QUESTIONS.length}
        aria-label="Questions answered"
        style={{ height: rule.base, background: c.rule, marginBottom: s[5] }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: c.mark, transition: 'width 200ms ease' }} />
      </div>

      <p style={{ ...label(10, 700, 0.16), color: c.dimOnInk, margin: 0, font: `700 10px/1.4 ${mono}` }}>
        {String(current + 1).padStart(2, '0')} / {QUESTIONS.length}
      </p>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ ...heading('d6'), color: '#fff', padding: 0, margin: px(s[4], 0, s[7]) }}>
          {q.prompt}
        </legend>

        <div style={{ display: 'grid', gap: s[3] }}>
          {q.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              className="pf-outline pf-nudge"
              style={{
                ...optionStyle,
                borderColor: o.unknown ? c.rule : c.ruleSoft,
                color: o.unknown ? c.dimOnInk : '#fff',
              }}
              onClick={() => onAnswer(current, i)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      {current > 0 && (
        <button
          type="button"
          className="pf-underline"
          style={{
            ...label(11, 700, 0.14),
            marginTop: s[6],
            background: 'none',
            border: 0,
            padding: 0,
            color: c.dimOnInk,
            cursor: 'pointer',
          }}
          onClick={() => onAnswer(current - 1, -1)}
        >
          ← BACK
        </button>
      )}
    </div>
  );
}
```

Note the Back contract: `onAnswer(index, -1)` means *clear this answer*. The parent (Task 8) translates `-1` to `null`, which makes `current` step back by one. One callback, one meaning of "the answers changed".

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors. (This will still fail to find `@/components/teardown/Quiz` consumers until Task 8 — that is fine, nothing imports it yet.)

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/teardown/Quiz.tsx`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/teardown/Quiz.tsx
git commit -m "feat(teardown): one-question-at-a-time quiz"
```

---

## Task 6: The verdict plate

The ungated payoff. Nothing is asked for on this screen.

**Files:**
- Create: `src/components/teardown/Verdict.tsx`

**Interfaces:**
- Consumes: `type Result` from `@/lib/teardown/score`; `SECTIONS` from `@/lib/teardown/questions`; tokens.
- Produces: `export default function Verdict({ result }: { result: Result })`.

- [ ] **Step 1: Write the component**

Create `src/components/teardown/Verdict.tsx`:

```tsx
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import { SECTIONS, type Axis } from '@/lib/teardown/questions';
import type { Result } from '@/lib/teardown/score';

/**
 * The ungated result. Verdict, score, four axis bars, three weakest sections
 * named and not elaborated — the elaboration is the report behind the email.
 *
 * The bars use `c.mark`, never `c.signal`. A score is not an availability
 * claim, and the greens are reserved so a green dot on this site still reads
 * as a status light rather than as decoration.
 */

const AXIS_LABEL: Record<Axis, string> = {
  defensibility: 'DEFENSIBILITY',
  failure: 'FAILURE DESIGN',
  cost: 'COST FLOOR',
  evaluation: 'EVALUATION',
};

const AXIS_QUESTION: Record<Axis, string> = {
  defensibility: "What's left if the vendor ships this?",
  failure: 'What happens when the model is wrong or down?',
  cost: 'Do the unit economics survive scale?',
  evaluation: 'How would you know quality got worse?',
};

const Bar = ({ axis, value }: { axis: Axis; value: number }) => (
  <div style={{ display: 'grid', gap: s[2] }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: s[4] }}>
      <span style={{ ...label(10, 700, 0.14), color: '#fff' }}>{AXIS_LABEL[axis]}</span>
      <span style={{ font: `700 11px/1 ${mono}`, color: c.mark }}>{value}</span>
    </div>
    <div style={{ height: rule.base, background: c.rule }}>
      <div style={{ height: '100%', width: `${value}%`, background: c.mark }} />
    </div>
    <span style={{ font: `400 13px/1.4 ${display}`, color: c.dimOnInk }}>{AXIS_QUESTION[axis]}</span>
  </div>
);

export default function Verdict({ result }: { result: Result }) {
  const axes: Axis[] = ['defensibility', 'failure', 'cost', 'evaluation'];

  return (
    <div>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>YOUR RESULT</p>

      <h2
        style={{
          margin: px(s[5], 0, 0),
          ...heading('d3'),
          textTransform: 'uppercase',
          color: c.accent,
          maxWidth: '16ch',
        }}
      >
        {result.verdict}
      </h2>

      <p style={{ margin: px(s[4], 0, 0), font: `700 20px/1 ${mono}`, color: '#fff' }}>
        {result.score}
        <span style={{ color: c.dimOnInk }}>/100</span>
      </p>

      {result.undecidedCount > 0 && (
        <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '54ch' }}>
          {result.undecidedCount} of 13 answers were <em>I&rsquo;m not sure</em>. Those are counted apart from
          low scores — an undecided question and a badly decided one are different problems.
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: s[7],
          marginTop: s[9],
        }}
      >
        {axes.map((a) => (
          <Bar key={a} axis={a} value={result.axes[a]} />
        ))}
      </div>

      <div style={{ marginTop: s[10], borderTop: `${rule.base}px solid ${c.rule}`, paddingTop: s[6] }}>
        <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>THINNEST THREE</p>
        <ol style={{ margin: px(s[5], 0, 0), padding: 0, listStyle: 'none', display: 'grid', gap: s[3] }}>
          {result.weakest.map((id) => (
            <li key={id} style={{ display: 'flex', gap: s[4], alignItems: 'baseline' }}>
              <span style={{ font: `700 11px/1 ${mono}`, color: c.dimOnInk }}>
                {String(id).padStart(2, '0')}
              </span>
              <span style={{ ...heading('d6'), color: '#fff' }}>{SECTIONS[id]}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx eslint src/components/teardown/Verdict.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/teardown/Verdict.tsx
git commit -m "feat(teardown): the ungated verdict plate"
```

---

## Task 7: The gate and the report view

**Files:**
- Create: `src/components/teardown/Gate.tsx`
- Create: `src/components/teardown/Report.tsx`

**Interfaces:**
- `Gate`: `export default function Gate({ onSubmit }: { onSubmit: (email: string, honeypot: string) => void })`.
- `Report`: `export default function Report({ model, sendFailed }: { model: ReportModel; sendFailed: boolean })`.

- [ ] **Step 1: Write the gate**

Create `src/components/teardown/Gate.tsx`:

```tsx
import { useState } from 'react';
import { c, display, heading, label, px, rule, s } from '@/components/portfolio/tokens';

/**
 * The one thing on this page that is asked for.
 *
 * The gate is a courtesy, not a lock — the report is computed in the browser
 * from data already in the bundle, so anyone reading source has it for free.
 * That is decision 5 of the spec and it is fine: hardening it would mean
 * moving the report server-side and paying a round trip on every reveal, to
 * protect something given away.
 *
 * The honeypot is a real input, positioned off-screen rather than hidden with
 * `display:none` — some bots skip anything undisplayed. It is `aria-hidden`
 * and out of the tab order, so nobody using the page ever meets it.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Gate({ onSubmit }: { onSubmit: (email: string, honeypot: string) => void }) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [touched, setTouched] = useState(false);

  const invalid = touched && !EMAIL.test(email);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (EMAIL.test(email)) onSubmit(email, honeypot);
      }}
      style={{ maxWidth: '52ch' }}
    >
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>THE WRITTEN BREAKDOWN</p>
      <h3 style={{ margin: px(s[5], 0, 0), ...heading('d5'), textTransform: 'uppercase', color: '#fff' }}>
        All nine sections
      </h3>
      <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk }}>
        What every answer indicates, section by section, and which of them you haven&rsquo;t decided yet.
        It opens here straight away — the email is so you keep a copy.
      </p>

      <div style={{ display: 'flex', gap: s[3], flexWrap: 'wrap', marginTop: s[7] }}>
        <label htmlFor="td-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Email address
        </label>
        <input
          id="td-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'td-email-error' : undefined}
          style={{
            flex: '1 1 240px',
            padding: px(s[4], s[5]),
            background: 'transparent',
            border: `${rule.base}px solid ${invalid ? c.mark : c.ruleSoft}`,
            color: '#fff',
            font: `400 15px/1.2 ${display}`,
          }}
        />
        <button
          type="submit"
          className="pf-nudge pf-nudge-lg"
          style={{
            padding: px(s[4], s[5]),
            background: c.accent,
            color: c.ink,
            border: 0,
            ...label(11, 700, 0.12),
            cursor: 'pointer',
          }}
        >
          OPEN THE BREAKDOWN
        </button>

        {/* Honeypot. Off-screen rather than `display:none`. */}
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />
      </div>

      {invalid && (
        <p id="td-email-error" style={{ margin: px(s[4], 0, 0), font: `400 13px/1.4 ${display}`, color: c.mark }}>
          That doesn&rsquo;t look like an email address.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Write the report view**

Create `src/components/teardown/Report.tsx`:

```tsx
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import type { ReportModel, SectionReport } from '@/lib/teardown/report';

/**
 * The nine sections, revealed the moment the email is submitted — it does not
 * wait on the network. A failed send therefore degrades to "no email arrived",
 * never to "no report", which is why `sendFailed` is a quiet line at the
 * bottom rather than an error state around the whole thing.
 *
 * Every string rendered here comes out of `ReportModel`, and every finding in
 * that model was copied verbatim from the question bank. Nothing on this
 * screen tells the reader what to do.
 */

const STATE_LABEL: Record<SectionReport['state'], string> = {
  decided: 'DECIDED',
  undecided: 'NOT DECIDED YET',
  mixed: 'PARTLY DECIDED',
};

const Section = ({ section }: { section: SectionReport }) => (
  <article style={{ borderTop: `${rule.base}px solid ${c.rule}`, padding: px(s[7], 0) }}>
    <div style={{ display: 'flex', gap: s[4], flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={{ font: `700 11px/1 ${mono}`, color: c.mark }}>
        {String(section.id).padStart(2, '0')}
      </span>
      <h3 style={{ margin: 0, ...heading('d6'), color: '#fff' }}>{section.title}</h3>
      <span style={{ ...label(10, 700, 0.14), color: c.dimOnInk, marginLeft: 'auto' }}>
        {STATE_LABEL[section.state]} · {section.score}/100
      </span>
    </div>
    <div style={{ display: 'grid', gap: s[3], marginTop: s[5], maxWidth: '62ch' }}>
      {section.findings.map((f) => (
        <p key={f} style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.dimOnInk, textWrap: 'pretty' }}>
          {f}
        </p>
      ))}
    </div>
  </article>
);

export default function Report({ model, sendFailed }: { model: ReportModel; sendFailed: boolean }) {
  return (
    <div>
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>THE BREAKDOWN</p>
      <h2 style={{ margin: px(s[5], 0, s[8]), ...heading('d4'), textTransform: 'uppercase', color: '#fff' }}>
        Nine sections, as you answered them
      </h2>

      {model.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      <div style={{ borderTop: `${rule.base}px solid ${c.rule}`, paddingTop: s[7] }}>
        <p style={{ margin: 0, font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '62ch' }}>
          That is what the answers show. What to change first, in what order, and what it costs to get
          wrong is the recorded teardown.
        </p>
        <a
          href="/work-with-me"
          className="pf-nudge pf-nudge-lg"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: s[3],
            marginTop: s[6],
            padding: px(s[4], s[5]),
            background: c.accent,
            color: c.ink,
            ...label(11, 700, 0.12),
            textDecoration: 'none',
          }}
        >
          SEE THE TEARDOWN<span>↗</span>
        </a>

        {sendFailed && (
          <p style={{ margin: px(s[6], 0, 0), font: `400 13px/1.4 ${display}`, color: c.dimOnInk }}>
            Couldn&rsquo;t email a copy just now — it&rsquo;s all here on the page.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx eslint src/components/teardown/`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/teardown/Gate.tsx src/components/teardown/Report.tsx
git commit -m "feat(teardown): email gate and the nine-section report view"
```

---

## Task 8: The page and the route

Wires the four components into one state machine and puts it on `/teardown`. First point at which the feature is usable end to end in the browser.

**Files:**
- Create: `src/pages/Teardown.tsx`
- Modify: `src/routes.tsx:18-31` (insert a record after `/work-with-me`)

**Interfaces:**
- Consumes: `Quiz`, `Verdict`, `Gate`, `Report`; `report` from `@/lib/teardown/report`; `QUESTIONS`; `Seo`.
- Produces: the default export the route record lazy-loads.

- [ ] **Step 1: Write the page**

Create `src/pages/Teardown.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import Gate from '@/components/teardown/Gate';
import Quiz from '@/components/teardown/Quiz';
import Report from '@/components/teardown/Report';
import Verdict from '@/components/teardown/Verdict';
import { QUESTIONS } from '@/lib/teardown/questions';
import { report } from '@/lib/teardown/report';

/**
 * `/teardown` — the free Wrapper Test.
 *
 * Unlike `/work-with-me`, this page is meant to be found: it carries full
 * `Seo`, and the intro plus the first question render into the prerendered
 * HTML rather than sitting behind a Start click, so a crawler arriving here
 * gets the actual proposition instead of a button.
 *
 * The whole quiz is one `answers` array in state. Nothing leaves the browser
 * until an email is submitted — abandoning halfway sends us nothing, by design.
 *
 * Submitting reveals the report immediately and fires the POST without
 * awaiting it. That ordering is the point: a failed send costs the reader a
 * copy in their inbox, never the report itself.
 */

const TITLE = 'The Wrapper Test — is your AI product real, or a wrapper?';
const DESCRIPTION =
  'A free 13-question diagnostic for AI features. Score your own product on defensibility, failure design, cost floor and evaluation, and get a nine-section written breakdown. No call, no signup to see your result.';

const section = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${c.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
} as const;

const TOTAL = QUESTIONS.length;

export default function Teardown() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [unlocked, setUnlocked] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const complete = answers.every((a) => a !== null);
  const model = useMemo(() => (complete ? report(answers as number[]) : null), [complete, answers]);

  /** `optionIndex === -1` is the Back contract: clear this answer. */
  const onAnswer = (questionIndex: number, optionIndex: number) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex === -1 ? null : optionIndex;
      return next;
    });

  const onSubmit = (email: string, honeypot: string) => {
    setUnlocked(true);
    fetch('/api/teardown-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, email, hp: honeypot }),
    })
      .then((r) => {
        if (!r.ok) setSendFailed(true);
      })
      .catch(() => setSendFailed(true));
  };

  return (
    <div style={{ background: c.ink, color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/teardown" type="website" />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: s[4],
          padding: px(s[4], gutter),
          borderBottom: `${rule.edge}px solid ${c.rule}`,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
          <span
            aria-hidden
            style={{ width: 22, height: 22, background: c.accent, border: `${rule.hair}px solid ${c.accentEdge}`, display: 'block' }}
          />
          <span style={{ ...label(11, 700, 0.12), color: '#fff' }}>ANADI THAKUR</span>
        </Link>
        <nav aria-label="Site" style={{ display: 'flex', alignItems: 'center', gap: s[6] }}>
          <Link to="/notes" className="pf-underline" style={{ ...label(11, 700, 0.14), color: '#fff' }}>
            NOTES
          </Link>
          <Link to="/work-with-me" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.dimOnInk }}>
            WORK WITH ME
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ ...section, borderTop: 'none' }}>
          <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: 0 }}>FREE · {TOTAL} QUESTIONS · 3 MINUTES</p>
          <h1 style={{ margin: px(s[5], 0, 0), ...heading('d2'), textTransform: 'uppercase', maxWidth: '15ch' }}>
            The <span style={{ color: c.mark }}>wrapper</span> test
          </h1>
          <p
            style={{
              margin: px(s[6], 0, 0),
              font: `400 17px/1.5 ${display}`,
              color: c.dimOnInk,
              maxWidth: '58ch',
              textWrap: 'pretty',
            }}
          >
            Answer thirteen questions about your own AI feature and see where it is thin — defensibility,
            failure design, cost floor, evaluation. It scores your answers, not a guess about your product,
            so nothing here is invented. Your result appears straight away; nothing is asked for to see it.
          </p>
          <p style={{ margin: px(s[5], 0, 0), font: `400 15px/1.55 ${display}`, color: c.dimOnInk, maxWidth: '58ch' }}>
            This tells you <em>where</em> the problems are. It does not tell you how to fix them — that is
            what the <Link to="/work-with-me" className="pf-underline" style={{ color: c.accent }}>recorded teardown</Link> is
            for.
          </p>
        </section>

        <section aria-label="The test" style={section}>
          {!complete && <Quiz answers={answers} onAnswer={onAnswer} />}
          {complete && model && <Verdict result={model.result} />}
        </section>

        {complete && model && !unlocked && (
          <section aria-label="The written breakdown" style={section}>
            <Gate onSubmit={onSubmit} />
          </section>
        )}

        {complete && model && unlocked && (
          <section aria-label="The breakdown" style={section}>
            <Report model={model} sendFailed={sendFailed} />
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

In `src/routes.tsx`, insert after the `/work-with-me` record (which ends at line 31):

```ts
  // Unlike `/work-with-me`, this one is meant to be found — it is the entry
  // point above the paid offers, so it carries full `Seo` and prerenders its
  // intro and first question rather than a Start button.
  {
    path: '/teardown',
    lazy: () => import('./pages/Teardown').then((m) => ({ Component: m.default })),
    entry: 'src/pages/Teardown.tsx',
  },
```

- [ ] **Step 3: Typecheck, lint, and run the whole suite**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx eslint src && npm test`
Expected: all clean, all tests pass.

- [ ] **Step 4: Build and confirm the page prerenders with real content**

```bash
npm run build
grep -ci "thirteen questions" dist/teardown/index.html
grep -c "without using the words" dist/teardown/index.html
```

Expected: both greater than 0. If `dist/teardown/index.html` does not exist, the route record is wrong — check it sits inside the `routes` array and the `entry` path matches the file exactly.

- [ ] **Step 5: Manual QA in the browser**

```bash
npm run dev
```

Walk this checklist at `http://localhost:5173/teardown`:

- Keyboard only, no mouse: Tab reaches every option, Enter and Space both select, focus is visible on each, Back returns to the previous question with its answer cleared.
- Answer all 13: the verdict plate appears, the axis bars are proportional, exactly three sections are listed under THINNEST THREE.
- Answer all 13 as "I'm not sure": score is 0, and the undecided line reads "13 of 13".
- Submit the gate with `not-an-email`: the inline error appears and nothing is revealed.
- Submit a valid address: the report appears immediately (the API 404s in dev, so the quiet "couldn't email a copy" line should also appear — that is the degradation path working).
- Resize to 360px wide: no horizontal scroll anywhere, the axis bars stack.
- DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`: nothing moves except the progress rule's width, which is acceptable as a state change rather than decoration.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Teardown.tsx src/routes.tsx
git commit -m "feat(teardown): the /teardown page and route"
```

---

## Task 9: The serverless function

**Files:**
- Create: `api/teardown-report.ts`
- Modify: `tsconfig.node.json:22` — `"include": ["vite.config.ts", "api"]`
- Modify: `package.json` — add `resend` and `@vercel/node`

**Interfaces:**
- Consumes: `isValidAnswers` from `../src/lib/teardown/score`; `report` from `../src/lib/teardown/report`; `renderEmail` from `../src/lib/teardown/email`.
- Produces: a default-exported Vercel handler at `POST /api/teardown-report`.

**Import-path warning:** the function imports by relative path (`../src/lib/teardown/score`), *not* through the `@/` alias. Vite resolves `@/`; the Vercel function bundler does not. If the build fails to resolve those imports on a preview deploy, the fallback is to move `src/lib/teardown/` to a root `lib/` imported by both sides — one import rewrite across six files and nothing else.

- [ ] **Step 1: Install the dependencies**

```bash
npm install resend
npm install -D @vercel/node
```

- [ ] **Step 2: Widen the node tsconfig**

In `tsconfig.node.json`, change the last line from `"include": ["vite.config.ts"]` to:

```json
  "include": ["vite.config.ts", "api"]
```

- [ ] **Step 3: Write the function**

Create `api/teardown-report.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { renderEmail } from '../src/lib/teardown/email';
import { report } from '../src/lib/teardown/report';
import { isValidAnswers } from '../src/lib/teardown/score';

/**
 * POST /api/teardown-report
 *
 * Takes raw answers and an address; re-runs the same pure modules the browser
 * ran and sends the result. It never accepts a scored report from the client —
 * the answers are thirteen small integers, which means the payload can be
 * validated exhaustively, and there is exactly one implementation of the
 * scoring in the system.
 *
 * Imports are relative, not `@/`-aliased: Vite resolves that alias, the
 * function bundler does not.
 *
 * Known limitation, accepted in the spec: there is no per-IP throttle, because
 * doing it properly needs shared state we deliberately have not built. The
 * honeypot and the strict payload check are the mitigations, and the blast
 * radius is one unsolicited, non-malicious email per request. If it is ever
 * actually abused the fix is Vercel KV and a counter, contained to this file.
 */

const FROM = 'Anadi Thakur <teardown@anadithakur.in>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!key) {
    // A preview deploy without secrets still serves the page and the in-browser
    // report. Only the copy in the inbox is missing, and the client already
    // degrades to a quiet line for exactly this case.
    console.warn('[teardown] RESEND_API_KEY not set — no email sent');
    return res.status(501).json({ error: 'email not configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const { answers, email, hp } = (body ?? {}) as { answers?: unknown; email?: unknown; hp?: unknown };

  // Honeypot: silence, not a signal. A bot that fills it gets the same 200 a
  // person gets, and learns nothing about why no mail arrived.
  if (typeof hp === 'string' && hp.length > 0) {
    return res.status(200).json({ ok: true });
  }

  if (!isValidAnswers(answers)) {
    return res.status(400).json({ error: 'invalid answers' });
  }
  if (typeof email !== 'string' || email.length > 254 || !EMAIL.test(email)) {
    return res.status(400).json({ error: 'invalid email' });
  }

  const { subject, html } = renderEmail(report(answers));
  const resend = new Resend(key);

  try {
    const sent = await resend.emails.send({ from: FROM, to: email, subject, html });
    if (sent.error) {
      console.error('[teardown] send failed', sent.error);
      return res.status(502).json({ error: 'send failed' });
    }
  } catch (err) {
    console.error('[teardown] send threw', err);
    return res.status(502).json({ error: 'send failed' });
  }

  // The list is a side effect. A failure here must not fail the request — the
  // send is what the reader asked for and it has already happened.
  if (audienceId) {
    try {
      await resend.contacts.create({ email, audienceId, unsubscribed: false });
    } catch (err) {
      console.warn('[teardown] audience add failed', err);
    }
  }

  return res.status(200).json({ ok: true });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Typecheck both projects**

Run: `npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.node.json --noEmit`
Expected: clean. If `tsconfig.node.json` errors on `process`, add `"types": ["node"]` to its `compilerOptions`.

- [ ] **Step 5: Verify the function locally**

```bash
npx vercel dev
```

In a second terminal:

```bash
# valid payload, no key configured locally -> 501, which is the designed degradation
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/teardown-report \
  -H 'Content-Type: application/json' \
  -d '{"answers":[0,0,0,0,0,0,0,0,0,0,0,0,0],"email":"you@example.com","hp":""}'

# wrong length -> 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/teardown-report \
  -H 'Content-Type: application/json' -d '{"answers":[0,0,0],"email":"you@example.com","hp":""}'

# bad email -> 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/teardown-report \
  -H 'Content-Type: application/json' \
  -d '{"answers":[0,0,0,0,0,0,0,0,0,0,0,0,0],"email":"nope","hp":""}'

# honeypot filled -> 200, no send
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/teardown-report \
  -H 'Content-Type: application/json' \
  -d '{"answers":[0,0,0,0,0,0,0,0,0,0,0,0,0],"email":"you@example.com","hp":"bot"}'

# GET -> 405
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/teardown-report
```

Expected, in order: `501 400 400 200 405`.

With `RESEND_API_KEY` set in `.env.local` and a verified domain, the first call returns `200` and the mail arrives.

- [ ] **Step 6: Commit**

```bash
git add api/teardown-report.ts tsconfig.node.json package.json package-lock.json
git commit -m "feat(teardown): serverless report send via Resend"
```

---

## Task 10: Wiring, sitemap, and the live send

Makes the tool reachable from the places people already are, and does the one end-to-end check no test can do.

**Files:**
- Modify: `src/pages/WorkWithMe.tsx` — a link above the offers
- Modify: `src/content/drops/system.mdx` — a closing link
- Modify: `scripts/generate-feeds.mjs:47-51` — sitemap entry

- [ ] **Step 1: Link it from the sales page**

In `src/pages/WorkWithMe.tsx`, inside the `<section id="offers">` block, immediately after the `<h2>Two ways in, in order</h2>` element, insert:

```tsx
        {/* The rung below the $199. Framed as a different thing, never as a
            sample of the paid teardown — the free tool diagnoses and stops,
            which is exactly what makes the paid one worth booking. */}
        <p style={{ ...body, marginTop: s[6] }}>
          Not sure it&rsquo;s worth booking yet?{' '}
          <Link to="/teardown" className="pf-underline" style={{ color: c.accent }}>
            Run the free Wrapper Test
          </Link>{' '}
          — thirteen questions, three minutes. It tells you where you&rsquo;re thin. What to do about it is
          what this page is for.
        </p>
```

`Link`, `body`, `s` and `c` are all already imported in that file.

- [ ] **Step 2: Link it from the design-template drop**

Append to the end of `src/content/drops/system.mdx`:

```mdx

---

## The scored version

This template asks you to decide nine things. [The Wrapper Test](/teardown) asks
whether you actually have — thirteen questions, three minutes, and a written
breakdown of which of the nine you have left open. It scores the answers you
give it, so it is only as honest as you are.
```

- [ ] **Step 3: Add it to the sitemap**

In `scripts/generate-feeds.mjs`, change the `pages` array (currently lines 47–51) to:

```js
const pages = [
  { url: ORIGIN, modified: posts[0].modified, priority: '1.0' },
  { url: `${ORIGIN}/notes`, modified: posts[0].modified, priority: '0.9' },
  // `/teardown` is the one sales-adjacent route meant to be found. `/work-with-me`
  // stays out: it is shared by link on purpose and has nothing to rank for.
  { url: `${ORIGIN}/teardown`, modified: posts[0].modified, priority: '0.9' },
  ...posts.map((p) => ({ url: p.url, modified: p.modified, priority: '0.8' })),
];
```

- [ ] **Step 4: Build and verify the wiring**

```bash
npm run build
grep -c "anadithakur.in/teardown" dist/sitemap.xml
grep -c "/teardown" dist/work-with-me/index.html
grep -c "/teardown" dist/drops/system/index.html
```

Expected: each greater than 0.

- [ ] **Step 5: Full check**

Run: `npm test && npx eslint src api && npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.node.json --noEmit && npm run check`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/WorkWithMe.tsx src/content/drops/system.mdx scripts/generate-feeds.mjs
git commit -m "feat(teardown): link the free test from the sales page, the drop, and the sitemap"
```

- [ ] **Step 7: Configure production and do the one live check**

In the Vercel dashboard for this project:

1. Add `RESEND_API_KEY` and `RESEND_AUDIENCE_ID` as environment variables (all environments).
2. In Resend, verify `anadithakur.in` as a sending domain — add the SPF and DKIM records it gives you to DNS, and wait for verification to go green before testing.

Then deploy a preview and run the test end to end with a real address:

- Complete all 13 questions on the preview URL.
- Submit a real email.
- Confirm the report appears instantly and the "couldn't email a copy" line does *not* appear.
- Open the email in Gmail **and** in Apple Mail. Check in both light and dark appearance: the cream CTA is legible on the ink plate, no section is missing, the layout does not collapse to full-bleed text, and the one link resolves to `https://anadithakur.in/work-with-me`.
- Confirm the contact landed in the Resend audience.

If the function 500s on the preview with a module-resolution error, apply the fallback named in Task 9: move `src/lib/teardown/` to a root `lib/teardown/` and update the six import paths on both sides.

---

## Self-review

**Spec coverage.** §2 decisions 1–9: decision 1 is Task 1 (no URL, no LLM anywhere in the plan); 2 is Tasks 1 and 3 (axes score, sections structure); 3 is Tasks 1, 3, and the global constraints, with two guard tests; 4 is Task 8's conditional rendering; 5 is documented in `Gate.tsx`; 6 is Task 8's `onSubmit`, which sets `unlocked` before `fetch`; 7 is Task 9's re-computation from answers; 8 is the absence of any database in the file structure; 9 is Task 8's `Seo` plus the Step 4 prerender check. §3 not-building list: nothing in any task adds an LLM, accounts, a PDF, share URLs, or A/B testing, and the `WorkWithMe.tsx:139` line is untouched. §4 questionnaire: Task 1, with the axis distribution and section map asserted in tests. §5 data model: Tasks 2 and 3, with the key-set test enforcing the missing fields. §6 modules: Tasks 1–4 and 9, including the relative-import warning. §7 error handling: every row has a home — POST failure and network failure in Task 8's `.catch`, malformed payload and honeypot and Resend failures and audience failure in Task 9, JS-disabled in Task 8's prerender check. §8 testing: Tasks 1–4 automated, Task 8 Step 5 and Task 10 Step 7 manual. §9 design: the global constraints plus each component's comments. §10 environment: Task 9 Step 1 and Task 10 Step 7.

**Placeholders.** None. Every code step carries the full source; no step says "similar to" or "add appropriate handling".

**Type consistency.** `Question`/`Option`/`Axis`/`SectionId` defined in Task 1 and used unchanged in 2, 3, 6; `Result` defined in Task 2 and consumed in 3, 6, 8; `ReportModel`/`SectionReport` defined in Task 3 and consumed in 4, 7, 8; `isValidAnswers` defined in Task 2 and consumed in Task 9; `report(answers)` takes raw answers everywhere it is called. The `onAnswer(index, -1)` Back contract is defined in Task 5 and honoured in Task 8. `renderEmail` returns `{ subject, html }` in Task 4 and is destructured that way in Task 9.
