import { MAX_RAW, QUESTIONS, type Axis, type SectionId } from './questions.js';

/**
 * Scoring: arithmetic only.
 *
 * Nothing in this module returns a sentence. That is deliberate: it makes the
 * tests pure numbers, and it leaves `report.ts` as the single place a finding
 * can reach a reader, which is the one place the no-prescriptions guard has to
 * watch.
 */

export type VerdictBand =
  | '🚨 THIN WRAPPER'
  | '⚠️ WRAPPER WITH FOUNDATIONS'
  | '🧩 REAL PRODUCT, THIN IN PLACES'
  | '🎯 REAL PRODUCT';

/**
 * Which sections came out thinnest — and whether that question has an answer.
 *
 * Nine sections and three slots means the cut can land inside a tie, and a
 * run where everything scores alike has no thinnest section at all. Taking the
 * first three ids in that case would present document order as a finding, so
 * the tie is kept in the shape and left for a reader to see.
 */
export type Thinnest = {
  /** Sections strictly thinner than the tie at the cut, worst first. 0..3. */
  ranked: SectionId[];
  /** Sections sharing the cut score, ascending id. Empty for a clean three. */
  tied: SectionId[];
  /** The score `tied` share. Meaningless, and 0, when `tied` is empty. */
  tiedScore: number;
};

export type Result = {
  /** 0..100. */
  score: number;
  verdict: VerdictBand;
  axes: Record<Axis, number>;
  sectionScores: Record<SectionId, number>;
  thinnest: Thinnest;
  undecidedCount: number;
};

const pct = (got: number, max: number) => (max === 0 ? 0 : Math.round((got / max) * 100));

/**
 * The four bands and the score each one starts at, highest first.
 *
 * `band` reads this table rather than a chain of its own, because the ladder
 * is now drawn for a reader: a shared result shows where its score falls, and
 * a printed threshold that disagreed with the one that picked the verdict
 * would discredit the very thing it is there to make checkable.
 */
export const BANDS: readonly { readonly min: number; readonly verdict: VerdictBand }[] = [
  { min: 85, verdict: '🎯 REAL PRODUCT' },
  { min: 65, verdict: '🧩 REAL PRODUCT, THIN IN PLACES' },
  { min: 40, verdict: '⚠️ WRAPPER WITH FOUNDATIONS' },
  { min: 0, verdict: '🚨 THIN WRAPPER' },
];

export const band = (score: number): VerdictBand =>
  // The last entry starts at 0, so a 0..100 score always finds one.
  BANDS.find((b) => score >= b.min)!.verdict;

/**
 * The only validation the serverless function needs. Answers are the entire
 * wire format, so an exhaustive check here is an exhaustive check of the
 * payload, which is why the body carries answers and not a scored report.
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

  const ids = (Object.keys(sectionScores) as unknown as string[])
    .map((k) => Number(k) as SectionId)
    .sort((a, b) => a - b);

  // Ascending id, then a stable sort by score, so ties keep id order.
  const asc = [...ids].sort((a, b) => sectionScores[a] - sectionScores[b]);

  // The third-place score. Everything below it is unambiguously thin; every
  // section holding it is tied for the last slot, however many there are.
  const cut = sectionScores[asc[2]];
  const below = asc.filter((id) => sectionScores[id] < cut);
  const at = ids.filter((id) => sectionScores[id] === cut);

  // Below and at together always cover at least three. Exactly three means the
  // cut fell cleanly and no id was picked over an equal one.
  const thinnest: Thinnest =
    below.length + at.length === 3
      ? { ranked: [...below, ...at], tied: [], tiedScore: 0 }
      : { ranked: below, tied: at, tiedScore: cut };

  const total = pct(raw, MAX_RAW);

  return { score: total, verdict: band(total), axes, sectionScores, thinnest, undecidedCount };
}
