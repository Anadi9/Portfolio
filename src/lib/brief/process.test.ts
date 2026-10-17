import { describe, expect, it, vi } from 'vitest';
import { memoryTicketStore } from '../tickets/memory';
import { processTicket } from './process';
import { splitDraft } from './draft';
import type { Brief } from './brief';
import type { LeadScan } from './scan';

const scanOk: LeadScan = { ok: true, url: 'https://a.example/', readiness: { score: 50, topFixes: [{ id: 'r', label: 'Empty HTML' }] }, headers: null, ms: 5 };
const brief: Brief = {
  summary: 'Booking app',
  stack: 'Lovable',
  situation: 'live',
  topRisk: 'Checkout breaks on Safari',
  risks: [],
  redFlags: [],
  approach: 'fix',
  likelyPackage: 'unknown',
  missingInfo: [],
  questions: [],
  source: 'ai',
};

function setup() {
  const m = memoryTicketStore();
  const send = vi.fn().mockResolvedValue({ data: {} });
  const deps = {
    scan: vi.fn().mockResolvedValue(scanOk),
    brief: vi.fn().mockResolvedValue(brief),
    notify: { resend: { emails: { send } }, fetch: vi.fn(), env: { TICKETS_INBOX: 'me@example.com' } },
  };
  return { m, send, deps };
}

const input = { email: 'jo@example.com', name: 'Jo', appUrl: 'a.example', kind: 'first_bug', answers: {}, source: 'bit' } as const;

describe('processTicket', () => {
  it('scans, briefs, drafts, posts a card and emails Anadi', async () => {
    const { m, send, deps } = setup();
    const t = await m.store.createTicket(input);
    expect(await processTicket(m.store, t.id, deps)).toBe('done');

    expect(deps.scan).toHaveBeenCalledWith('a.example');
    expect(m.briefs).toHaveLength(1);
    expect(m.briefs[0].body).toMatchObject({ topRisk: 'Checkout breaks on Safari', scan: { ok: true } });

    expect(m.messages).toHaveLength(1);
    expect(m.messages[0]).toMatchObject({ kind: 'first_reply', channel: 'email', status: 'draft' });
    const { subject, body } = splitDraft(m.messages[0].body);
    expect(subject).toBe(`Your first bug: a.example (${t.number})`);
    expect(body.startsWith('Hi Jo,')).toBe(true);

    expect(m.events.map((e) => e.type)).toContain('brief_ready');
    expect(m.feed).toMatchObject([{ bot: 'bit', kind: 'draft_ready', action: 'approve_send', ref: m.messages[0].id, ticketId: t.id }]);
    expect(m.feed[0].title).toContain(t.number);

    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('me@example.com');
    expect(mail.subject).toContain('Brief ready');
    expect(mail.html).toContain(`/admin#card-${m.feed[0].id}`);
    expect(mail.html).not.toContain('jo@example.com');
  });

  it('runs once per ticket', async () => {
    const { m, deps } = setup();
    const t = await m.store.createTicket(input);
    await processTicket(m.store, t.id, deps);
    expect(await processTicket(m.store, t.id, deps)).toBe('skipped');
    expect(m.briefs).toHaveLength(1);
    expect(m.messages).toHaveLength(1);
  });

  it('reports a missing ticket', async () => {
    const { m, deps } = setup();
    expect(await processTicket(m.store, 'nope', deps)).toBe('missing');
  });

  it('still briefs and drafts when the scan fails', async () => {
    const { m, deps } = setup();
    deps.scan.mockResolvedValue({ ok: false, url: null, error: 'blocked', ms: 1 });
    const t = await m.store.createTicket(input);
    expect(await processTicket(m.store, t.id, deps)).toBe('done');
    expect(m.briefs[0].body).toMatchObject({ scan: { ok: false, error: 'blocked' } });
    expect(m.messages).toHaveLength(1);
  });

  it('saves the fallback brief when the brief writer throws', async () => {
    const { m, deps } = setup();
    deps.brief.mockRejectedValue(new Error('boom'));
    const t = await m.store.createTicket(input);
    expect(await processTicket(m.store, t.id, deps)).toBe('done');
    expect(m.briefs[0].body).toMatchObject({ source: 'fallback', topRisk: 'Empty HTML' });
  });
});
