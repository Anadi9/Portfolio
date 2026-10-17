/**
 * Bit's send policy. Transactional messages go out on their own; anything about
 * price, scope, findings, fit or a follow-up nudge is saved as a draft for
 * Anadi to approve first.
 */
export type SendPolicy = 'auto' | 'draft';

export const MESSAGE_POLICY: Record<string, SendPolicy> = {
  ticket_receipt: 'auto',
  new_ticket_admin: 'auto',
  stage_change: 'auto',
  brief_ready: 'auto',
  followup: 'draft',
  quote: 'draft',
  findings: 'draft',
  fit: 'draft',
};

/** Unknown kinds are drafts: the safe default is never to send by surprise. */
export function policyFor(kind: string): SendPolicy {
  return Object.prototype.hasOwnProperty.call(MESSAGE_POLICY, kind) ? MESSAGE_POLICY[kind] : 'draft';
}
