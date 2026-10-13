import { QUESTIONS, type Answer, type Question } from './questions';

/**
 * Scores the DPDP self-check. A "yes" earns a question's full weight,
 * "partly" half, and "no" or "not sure" nothing: an obligation you can't
 * confirm you meet is one you can't show the Board you meet.
 *
 * Unanswered questions don't count toward the score, so a half-finished
 * check shows a provisional number rather than a falsely low one.
 */

export type Band = { min: number; label: string; line: string };

export const BANDS: Band[] = [
  { min: 80, label: 'Nearly ready', line: 'Most of the product already behaves the way the Act asks. Close the gaps below and get it reviewed.' },
  { min: 50, label: 'Partly ready', line: 'The basics are there, but some obligations need product work before May 2027.' },
  { min: 0, label: 'Not ready yet', line: 'Several obligations need building into the product. Starting now leaves time to do it properly.' },
];

export type Result = {
  answered: number;
  score: number;
  band: Band;
  /** Non-"yes" answers, heaviest first, then in question order. */
  gaps: (Question & { answer: Answer })[];
};

export function scoreAnswers(answers: Partial<Record<string, Answer>>): Result {
  let earned = 0;
  let possible = 0;
  const gaps: Result['gaps'] = [];
  QUESTIONS.forEach((q) => {
    const a = answers[q.id];
    if (!a) return;
    possible += q.weight;
    earned += a === 'yes' ? q.weight : a === 'partly' ? q.weight / 2 : 0;
    if (a !== 'yes') gaps.push({ ...q, answer: a });
  });
  gaps.sort((x, y) => y.weight - x.weight || QUESTIONS.indexOf(x) - QUESTIONS.indexOf(y));
  const score = possible ? Math.round((earned / possible) * 100) : 0;
  return { answered: Object.values(answers).filter(Boolean).length, score, band: BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1], gaps };
}
