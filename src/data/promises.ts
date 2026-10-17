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
  | 'teardown'
  | 'audit_credit'
  | 'teardown_credit'
  | 'refund_if_nothing'
  | 'daily_update'
  | 'pay_when_live'
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
    what: 'Fixed price after the video',
    where: ['src/data/bitsQuest.ts', 'src/data/bitsQuestFacts.ts'],
    clockStarts: 'Video sent',
    deadlineHours: null,
    keptWhen: 'The video reply states one fixed price',
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
  teardown: {
    id: 'teardown',
    what: 'Recorded teardown',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Teardown paid',
    deadlineHours: 2 * DAY,
    keptWhen: 'Video and written fix list sent',
    enforcedIn: 'Phase 4',
  },
  audit_credit: {
    id: 'audit_credit',
    what: 'Audit credited 100%',
    where: ['src/data/bitsQuestFacts.ts', 'src/pages/Rescue.tsx'],
    clockStarts: 'Audit paid',
    deadlineHours: 30 * DAY,
    keptWhen: 'A fix booked within 30 days gets the credit on its invoice',
    enforcedIn: 'Phase 7 (invoices)',
  },
  teardown_credit: {
    id: 'teardown_credit',
    what: 'Teardown credited toward the audit or an AI build',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Teardown paid',
    deadlineHours: 30 * DAY,
    keptWhen: 'Credit applied',
    enforcedIn: 'Phase 7',
  },
  refund_if_nothing: {
    id: 'refund_if_nothing',
    what: 'Nothing found? Full refund',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Audit report sent',
    deadlineHours: null,
    keptWhen: 'Refund issued when the report finds no real issue',
    enforcedIn: 'Phase 4 (gate)',
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
  pay_when_live: {
    id: 'pay_when_live',
    what: 'Pay the second half when it is live',
    where: ['src/data/bitsQuestFacts.ts'],
    clockStarts: 'Stage live entered',
    deadlineHours: null,
    keptWhen: 'Second invoice only after the client confirms it works',
    enforcedIn: 'Phase 4 (gate)',
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
