/**
 * The DPDP self-check: thirteen questions, each about something the product
 * does, mapped to the obligation in the DPDP Act, 2023 or the DPDP Rules, 2025
 * that asks for it. Phrased as product behaviour on purpose: a founder can
 * answer "can a user delete their account?" without a lawyer, and the gap it
 * reveals is an engineering job.
 *
 * Scoring is in `score.ts`. Both are pure, so the page prerenders every
 * question and the tests run on plain data. Nothing a visitor answers leaves
 * their browser.
 *
 * The `basis` lines summarise what the law asks; they are not legal advice and
 * the page says so. Re-check them if the Rules are amended.
 */

export type Area = 'Notice & consent' | 'User rights' | 'Retention' | 'Children' | 'Security & breach' | 'Accountability';

export type Question = {
  id: string;
  area: Area;
  /** The question, about the product, answerable without a lawyer. */
  q: string;
  /** What the law asks, in one line. */
  basis: string;
  /** What to build when the answer isn't yes. */
  fix: string;
  /** How much a gap here matters, 1–3. */
  weight: 1 | 2 | 3;
};

export const QUESTIONS: Question[] = [
  {
    id: 'notice',
    area: 'Notice & consent',
    q: 'Before you collect personal data, do people see a clear notice listing what you collect and why?',
    basis: 'A standalone notice in plain language, itemising the data and each purpose, given with the request for consent.',
    fix: 'Build a short, itemised notice into sign-up and every form that collects personal data, separate from your terms.',
    weight: 3,
  },
  {
    id: 'consent',
    area: 'Notice & consent',
    q: 'Do people consent to each purpose separately, rather than by accepting your terms of service?',
    basis: 'Consent must be free, specific, informed and given by a clear affirmative action, limited to what each purpose needs.',
    fix: 'Replace the bundled checkbox with per-purpose consent (for example, account vs marketing), unticked by default.',
    weight: 3,
  },
  {
    id: 'withdraw',
    area: 'Notice & consent',
    q: 'Can people withdraw consent as easily as they gave it, from inside the product?',
    basis: 'Withdrawing consent must be as easy as giving it, and processing for that purpose stops once it is withdrawn.',
    fix: 'Add a consent settings page where each purpose can be switched off in one step, wired to stop that processing.',
    weight: 2,
  },
  {
    id: 'records',
    area: 'Notice & consent',
    q: 'Do you keep a record of who consented, when, and to which version of the notice?',
    basis: 'You must be able to show that consent was given, on the notice that was in force at the time.',
    fix: 'Log every consent and withdrawal with a timestamp, the purposes and the notice version.',
    weight: 2,
  },
  {
    id: 'access',
    area: 'User rights',
    q: 'Can a user get a summary of the personal data you hold about them and who you shared it with?',
    basis: 'People have the right to a summary of their data, the processing done on it, and the parties it was shared with.',
    fix: 'Add a "download my data" or data summary request flow, with a way to verify it is really them.',
    weight: 2,
  },
  {
    id: 'correct',
    area: 'User rights',
    q: 'Can users correct or update their personal data themselves, or by a simple request?',
    basis: 'People have the right to correct, complete and update their personal data.',
    fix: 'Make profile data editable, and give a request path for anything that isn’t.',
    weight: 1,
  },
  {
    id: 'delete',
    area: 'User rights',
    q: 'When someone deletes their account, is their data actually erased, including in backups and the tools you send it to?',
    basis: 'People can ask for erasure, and data must be erased once its purpose is served, by you and by anyone processing it for you.',
    fix: 'Build account deletion that removes data from your database, queues it out of backups, and tells your vendors to erase it.',
    weight: 3,
  },
  {
    id: 'grievance',
    area: 'User rights',
    q: 'Do you publish a contact for privacy questions and complaints, and answer within a set time?',
    basis: 'You must publish a contact for privacy questions and run a grievance process with a response deadline set by the Rules.',
    fix: 'Publish a privacy contact, route requests to one inbox or form, and track response times.',
    weight: 1,
  },
  {
    id: 'retention',
    area: 'Retention',
    q: 'Do you delete personal data once you no longer need it, on a schedule, rather than keeping it forever?',
    basis: 'Data may only be kept as long as its purpose needs; certain large platforms must erase after a set period of inactivity, with notice first.',
    fix: 'Set retention periods per kind of data and run scheduled erasure, with a warning email before inactive accounts are removed.',
    weight: 2,
  },
  {
    id: 'children',
    area: 'Children',
    q: 'If people under 18 could use your product, do you get verifiable parental consent and avoid tracking or targeting them?',
    basis: 'Processing a child’s data (under 18) needs verifiable parental consent, and tracking, behavioural monitoring and targeted ads at children are prohibited.',
    fix: 'Add an age gate, a parental consent flow where needed, and switch off tracking and ad targeting for under-18 accounts.',
    weight: 2,
  },
  {
    id: 'security',
    area: 'Security & breach',
    q: 'Is personal data encrypted, access-controlled, and are access logs kept for at least a year?',
    basis: 'Reasonable security safeguards are required, including encryption or masking, access control, and logs retained for a year. Failing to take them carries the largest penalties.',
    fix: 'Encrypt personal data, lock down database access (row-level rules, least privilege), and keep access logs for 12 months.',
    weight: 3,
  },
  {
    id: 'breach',
    area: 'Security & breach',
    q: 'If there were a data breach tomorrow, would you know, and could you tell users and the Data Protection Board within 72 hours?',
    basis: 'Breaches must be reported to affected people and the Board without delay, with a detailed report to the Board within 72 hours.',
    fix: 'Add alerting on unusual access, and write a breach runbook with notice templates and who does what.',
    weight: 3,
  },
  {
    id: 'vendors',
    area: 'Accountability',
    q: 'Do you know every tool that receives your users’ personal data (analytics, email, payments, AI), with a contract for each?',
    basis: 'You stay responsible for data your processors handle, so each needs a valid contract and the same erasure duties.',
    fix: 'List every vendor that touches personal data, put a data processing agreement in place, and remove the ones you don’t need.',
    weight: 2,
  },
];

export const ANSWERS = ['yes', 'partly', 'no', 'unsure'] as const;
export type Answer = (typeof ANSWERS)[number];

export const ANSWER_LABEL: Record<Answer, string> = { yes: 'Yes', partly: 'Partly', no: 'No', unsure: 'Not sure' };
