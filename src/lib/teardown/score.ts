import { MAX_RAW, QUESTIONS, type Axis, type SectionId } from './questions';

/**
 * Scoring: arithmetic only.
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
