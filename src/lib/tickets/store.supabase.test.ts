import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseStore } from './store';

type Call = { table: string; op: string; row: unknown };

/** A minimal fake of the query-builder calls createTicket makes. */
function fakeDb(fail: { tickets?: boolean; events?: boolean } = {}) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      const run = (op: string, row: unknown) => {
        calls.push({ table, op, row });
        const bad = (table === 'tickets' && fail.tickets) || (table === 'ticket_events' && fail.events);
        const result = bad
          ? { data: null, error: { message: `${table} down` } }
          : { data: table === 'clients' ? { id: 'c1' } : { id: 't1', number: 'A-1001', client_id: 'c1', kind: 'audit', stage: 'inbox', answers: {}, board_opt_in: false, whatsapp_opt_in: false, source: 'bit', created_at: 'x', updated_at: 'x' }, error: null };
        const chain: any = { select: () => chain, single: () => Promise.resolve(result), then: (f: any, r: any) => Promise.resolve(result).then(f, r) };
        return chain;
      };
      return { upsert: (row: unknown) => run('upsert', row), insert: (row: unknown) => run('insert', row) };
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const input = { email: 'Ana@Example.com', kind: 'audit', answers: {}, source: 'bit' } as const;

describe('supabase ticket store: createTicket', () => {
  it('rejects invalid input before any write', async () => {
    const { db, calls } = fakeDb();
    const store = supabaseStore(db);
    await expect(store.createTicket({ ...input, email: 'nope' })).rejects.toThrow();
    await expect(store.createTicket({ ...input, name: 'x'.repeat(121) })).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('lower-cases the email and does not send a whitespace-only name', async () => {
    const { db, calls } = fakeDb();
    await supabaseStore(db).createTicket({ ...input, name: '   ' });
    expect(calls[0]).toMatchObject({ table: 'clients', op: 'upsert', row: { email: 'ana@example.com' } });
    expect(calls[0].row).not.toHaveProperty('name');
  });

  it('still returns the ticket when the created-event insert fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = fakeDb({ events: true });
    const t = await supabaseStore(db).createTicket(input);
    expect(t.number).toBe('A-1001');
    expect(err).toHaveBeenCalledWith('[tickets]', expect.stringContaining('"op":"addEvent"'));
    err.mockRestore();
  });

  it('throws when the ticket insert fails, and writes no event', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db, calls } = fakeDb({ tickets: true });
    await expect(supabaseStore(db).createTicket(input)).rejects.toThrow(/insert ticket/);
    expect(calls.some((c) => c.table === 'ticket_events')).toBe(false);
    expect(err).toHaveBeenCalledWith('[tickets]', expect.stringContaining('createTicket'));
    err.mockRestore();
  });
});
