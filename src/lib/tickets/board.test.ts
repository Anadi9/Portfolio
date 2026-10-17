import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from './memory';
import { boardColumns, MIN_BOARD_TICKETS } from './board';
import type { BoardTicket } from './types';

const { holder } = vi.hoisted(() => ({ holder: { store: null as unknown } }));
vi.mock('./store.js', async (orig) => ({ ...(await orig<typeof import('./store')>()), ticketStore: () => holder.store }));

import handler from '../../../api/board';

const call = async (method = 'GET') => {
  const res: { statusCode?: number; body?: any; headers: Record<string, string> } = { headers: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = {
    status: (c: number) => ((res.statusCode = c), r),
    json: (b: unknown) => ((res.body = b), r),
    setHeader: (k: string, v: string) => ((res.headers[k] = v), r),
  };
  await handler({ method, headers: {} } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
};

const t = (number: string, stage: BoardTicket['stage']): BoardTicket => ({ number, category: 'Auth', stack: 'Next.js', stage, updatedAt: '2026-10-17T00:00:00Z' });

afterEach(() => {
  holder.store = null;
  vi.restoreAllMocks();
});

describe('boardColumns', () => {
  it('groups into the five stages in order, labelled, and drops closed', () => {
    const b = boardColumns([t('A-1001', 'inbox'), t('A-1002', 'live'), t('A-1003', 'inbox'), t('A-1004', 'closed')]);
    expect(b.columns.map((c) => c.label)).toEqual(['Inbox', 'Bug review', 'Audit', 'Fixing', 'Live ✓']);
    expect(b.columns[0].tickets.map((x) => x.number)).toEqual(['A-1001', 'A-1003']);
    expect(b.columns[4].tickets).toHaveLength(1);
    expect(b.total).toBe(3);
    expect(MIN_BOARD_TICKETS).toBe(3);
  });
  it('is five empty columns for no tickets', () => {
    expect(boardColumns([])).toMatchObject({ total: 0, columns: expect.arrayContaining([expect.objectContaining({ tickets: [] })]) });
  });
});

describe('GET /api/board', () => {
  it('501 when tickets are not configured, uncached', async () => {
    const res = await call();
    expect(res.statusCode).toBe(501);
    expect(res.body).toEqual({ error: 'tickets not configured' });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('maps opted-in tickets to columns with the cache header, exposing only safe fields', async () => {
    const mem = memoryTicketStore();
    holder.store = mem.store;
    const a = await mem.store.createTicket({ email: 'a@example.com', name: 'Secret Name', appUrl: 'https://secret.example.com', kind: 'first_bug', answers: {}, source: 'bit', boardOptIn: true, stack: 'Next.js' });
    await mem.store.createTicket({ email: 'b@example.com', kind: 'first_bug', answers: {}, source: 'bit', boardOptIn: false });
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('s-maxage=300, stale-while-revalidate=600');
    expect(res.body.total).toBe(1);
    expect(res.body.columns[0].tickets).toEqual([expect.objectContaining({ number: a.number, stage: 'inbox' })]);
    expect(JSON.stringify(res.body)).not.toMatch(/secret|example\.com/i);
  });

  it('405 for other methods', async () => {
    expect((await call('POST')).statusCode).toBe(405);
  });
});
