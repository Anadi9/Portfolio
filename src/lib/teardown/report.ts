import { QUESTIONS, SECTIONS, type SectionId } from './questions.js';
import { score, type Result } from './score.js';

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
 * Takes raw answers rather than a `Result`, because findings need the answers, and
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
