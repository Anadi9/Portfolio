import type { Audience, Prompt } from '@/data/prompts';

export type PromptQuery = {
  /** Free text, matched against title, prompt body and the "why it works" line. */
  q: string;
  /** `null` means every category. */
  categoryId: number | null;
  /** `null` means every audience. */
  audience: Audience | null;
};

export const EMPTY_QUERY: PromptQuery = { q: '', categoryId: null, audience: null };

/**
 * Substring match across every field a reader might remember.
 *
 * Not just the title. Someone looking for the pre-mortem prompt is as likely to
 * search "devil's advocate" — a phrase that only appears in the prompt body —
 * as they are to search its heading, and a search that only reads titles fails
 * exactly the person who half-remembers what a prompt said.
 *
 * Deliberately not fuzzy. A typo-tolerant match over a hundred short records
 * returns more noise than signal, and the filter chips already handle the case
 * where someone is browsing rather than looking.
 */
const matchesText = (prompt: Prompt, needle: string): boolean => {
  const haystack = `${prompt.title} ${prompt.prompt} ${prompt.why} ${prompt.category}`.toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
};

/** The three filters, ANDed. Order preserved — the array is already curated. */
export const filterPrompts = (prompts: Prompt[], query: PromptQuery): Prompt[] =>
  prompts.filter(
    (p) =>
      (query.categoryId === null || p.categoryId === query.categoryId) &&
      (query.audience === null || p.audience === query.audience) &&
      (query.q.trim() === '' || matchesText(p, query.q)),
  );

/**
 * How many prompts each audience chip would show, given the rest of the query.
 *
 * Counts respect the other active filters but not the chip's own, so a chip
 * never advertises a number that turns into an empty page when pressed, and
 * never reads zero just because a different chip is selected.
 */
export const audienceCounts = (
  prompts: Prompt[],
  query: PromptQuery,
): Record<Audience | 'all', number> => {
  const scoped = filterPrompts(prompts, { ...query, audience: null });
  return {
    all: scoped.length,
    both: scoped.filter((p) => p.audience === 'both').length,
    professionals: scoped.filter((p) => p.audience === 'professionals').length,
    students: scoped.filter((p) => p.audience === 'students').length,
  };
};

/** The same, per category. Keyed by `categoryId`, plus `all`. */
export const categoryCounts = (prompts: Prompt[], query: PromptQuery): Record<string, number> => {
  const scoped = filterPrompts(prompts, { ...query, categoryId: null });
  const counts: Record<string, number> = { all: scoped.length };
  for (const p of scoped) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
  return counts;
};
