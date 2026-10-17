import { afterEach, describe, expect, it, vi } from 'vitest';
import { admin } from './client';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

const reply = (status: number, body: unknown) => fetchMock.mockResolvedValueOnce({ status, ok: status < 300, json: async () => body });

describe('admin client', () => {
  it('posts each op as JSON to /api/admin with same-origin credentials', async () => {
    reply(200, { items: [] });
    const r = await admin.feed();
    expect(r).toEqual({ ok: true, auth: true, data: { items: [] } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(init.body)).toEqual({ op: 'feed' });
  });

  it('passes the op fields', async () => {
    reply(200, { ok: true });
    await admin.send('t1', 'm1', 'Subj', 'Body');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ op: 'send', id: 't1', messageId: 'm1', subject: 'Subj', body: 'Body' });
    reply(200, { ok: true });
    await admin.snooze('f1', 3);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ op: 'snooze', feedId: 'f1', hours: 3 });
  });

  it('reports a lost session as auth:false', async () => {
    reply(401, { error: 'unauthorized' });
    expect(await admin.list()).toEqual({ ok: false, auth: false, error: 'unauthorized' });
  });

  it('reports other failures with their message', async () => {
    reply(400, { error: 'fill in the placeholders first' });
    expect(await admin.send('t', 'm', 's', '[PRICE]')).toEqual({ ok: false, auth: true, error: 'fill in the placeholders first' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await admin.feed()).toEqual({ ok: false, auth: true, error: 'Network error. Try again.' });
  });
});
