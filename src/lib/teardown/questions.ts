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
