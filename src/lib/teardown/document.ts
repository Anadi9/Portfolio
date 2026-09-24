import { QUESTIONS } from './questions.js';
import type { ReportModel, SectionState } from './report.js';
import type { VerdictBand } from './score.js';

/**
 * The document layer: everything that makes the report read as a technical
 * report rather than as a web page, expressed as data.
 *
 * Three surfaces render this model — the page (`Report.tsx`), the email body
 * and the attached copy (`email.ts`) — and they must agree on the masthead,
 * the reference, the metadata block and the section index, or the copy in the
 * inbox stops being the same document as the one on the screen. So the strings
 * are derived once, here, and each surface only decides how to draw them.
 *
 * Nothing here writes a finding. Like every module downstream of the question
 * bank it only labels and counts; the sentences a reader acts on are still
 * authored in exactly one file.
 */

export const DOC_TITLE = 'The Wrapper Test';
export const DOC_KIND = 'Diagnostic report';
export const DOC_SERIES = 'WT';

export const STATE_LABEL: Record<SectionState, string> = {
  decided: 'DECIDED',
  undecided: 'NOT DECIDED',
  mixed: 'PARTLY DECIDED',
};

/**
 * Band letter for the reference. Keyed off the verdict rather than recomputed
 * from the score, so a new band is a type error here instead of a silently
 * wrong letter on a document.
 */
export const BAND_CODE: Record<VerdictBand, string> = {
  '🎯 REAL PRODUCT': 'A',
  '🧩 REAL PRODUCT, THIN IN PLACES': 'B',
  '⚠️ WRAPPER WITH FOUNDATIONS': 'C',
  '🚨 THIN WRAPPER': 'D',
};

/** `WT-13/072-B`: series, question count, score, band. Deterministic on answers. */
export const docRef = (model: ReportModel) =>
  `${DOC_SERIES}-${QUESTIONS.length}/${String(model.result.score).padStart(3, '0')}-${
    BAND_CODE[model.result.verdict]
  }`;

const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** `03 SEP 2026`. Month names, because 03/09 and 09/03 are the same document. */
export const issuedOn = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export type MetaRow = { label: string; value: string };

/**
 * The masthead block. Every value is read off the model or off the question
 * bank; none of it is a claim about the reader's product that the answers do
 * not already carry.
 */
export function metaRows(model: ReportModel, issued: string): MetaRow[] {
  const { result } = model;
  return [
    { label: 'Reference', value: docRef(model) },
    { label: 'Issued', value: issued },
    { label: 'Instrument', value: `${QUESTIONS.length} questions · 4 axes · ${model.sections.length} sections` },
    { label: 'Result', value: `${result.score}/100 · ${result.verdict}` },
    {
      label: 'Undecided',
      value: `${result.undecidedCount} of ${QUESTIONS.length} answers`,
    },
    { label: 'Scope', value: 'Findings only — no recommendations' },
  ];
}

/** `§` label for a section or a finding: `04`, `04.2`. */
export const clause = (sectionId: number, findingIndex?: number) =>
  findingIndex === undefined
    ? String(sectionId).padStart(2, '0')
    : `${String(sectionId).padStart(2, '0')}.${findingIndex + 1}`;

/** The one sentence that separates this document from the paid one. */
export const CLOSING =
  'That is what the answers show. What to change first, in what order, and what it costs to get wrong is the $50 recorded teardown.';

export const END_MARK = 'END OF REPORT';
