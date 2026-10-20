/**
 * Every promise the site makes, with what starts its clock and what counts as
 * kept. The site copy reads its numbers from here, and Coach (master plan
 * Phase 4) turns each one into a commitment per client, so the copy and the
 * deadlines can't drift apart.
 *
 * No imports, so serverless functions and `bitsQuestFacts.ts` can load it.
 * `where` lists the files that state the promise; a test checks they exist.
 */

export type PromiseId =
  | 'first_bug_video'
  | 'first_bug_weekly_cap'
  | 'fixed_price_after_video'
  | 'audit_report'
  | 'daily_update'
  | 'care_review'
  | 'deletion'
  | 'daily_scorecard';

export type SitePromise = {
  id: PromiseId;
  what: string;
  where: string[];
  clockStarts: string;
  /** Hours from the clock start; null when the promise is a condition, not a deadline. */
  deadlineHours: number | null;
  keptWhen: string;
  /** Master plan phase that starts tracking it. */
  enforcedIn: string;
};

const DAY = 24;

export const PROMISES: Record<PromiseId, SitePromise> = {
  first_bug_video: {
    id: 'first_bug_video',
    what: 'Free first-bug video',
    where: ['src/pages/Hub.tsx', 'src/pages/Rescue.tsx', 'src/pages/AiVisibility.tsx', 'src/pages/Dpdp.tsx', 'src/components/audit/AppAuditForm.tsx', 'src/components/portfolio/Contact.tsx', 'src/data/bitsQuestFacts.ts', 'src/data/bitsQuest.ts'],
    clockStarts: 'first_bug ticket created',
    deadlineHours: DAY,
    keptWhen: 'The first reply with the video link is sent',
    enforcedIn: 'Phase 2 (reply-by), Phase 4 (commitment)',
  },
  first_bug_weekly_cap: {
    id: 'first_bug_weekly_cap',
    what: 'Five first-bug videos a week',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Monday 00:00 IST',
    deadlineHours: 7 * DAY,
    keptWhen: 'No more than five accepted; extras are told the next free slot',
    enforcedIn: 'Phase 4',
  },
  fixed_price_after_video: {
    id: 'fixed_price_after_video',
    what: 'Fixed quote after the video',
    where: ['src/data/bitsQuest.ts', 'src/data/bitsQuestFacts.ts'],
    clockStarts: 'Video sent',
    deadlineHours: null,
    keptWhen: 'The video reply states one fixed quote',
    enforcedIn: 'Phase 2 (send refuses [PRICE])',
  },
  audit_report: {
    id: 'audit_report',
    what: 'Production audit report',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Audit paid',
    deadlineHours: 2 * DAY,
    keptWhen: 'Report sent',
    enforcedIn: 'Phase 4',
  },
  daily_update: {
    id: 'daily_update',
    what: 'Daily written updates',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Stage fixing entered, then each update',
    deadlineHours: DAY,
    keptWhen: 'An update sent every day while in fixing',
    enforcedIn: 'Phase 4',
  },
  care_review: {
    id: 'care_review',
    what: 'Care monthly health review',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Care starts, then each review',
    deadlineHours: 31 * DAY,
    keptWhen: 'Review sent each month',
    enforcedIn: 'Phase 7',
  },
  deletion: {
    id: 'deletion',
    what: 'Deletion request handled',
    where: ['src/pages/Legal.tsx'],
    clockStarts: 'Request received',
    deadlineHours: 30 * DAY,
    keptWhen: 'Data deleted and the requester told',
    enforcedIn: 'Phase 4',
  },
  daily_scorecard: {
    id: 'daily_scorecard',
    what: 'Daily public scorecard',
    where: ['src/pages/Scorecard.tsx'],
    clockStarts: 'Previous run',
    deadlineHours: DAY,
    keptWhen: 'A run saved in the last 24 hours',
    enforcedIn: 'Phase 4',
  },
};

export function promiseHours(id: PromiseId): number {
  const h = PROMISES[id].deadlineHours;
  if (h == null) throw new Error(`promise ${id} has no deadline`);
  return h;
}
