import { describe, expect, it } from 'vitest';
import { jobsForHour } from './cron';

describe('jobsForHour', () => {
  it('runs the heartbeat every hour', () => {
    for (let h = 0; h < 24; h++) expect(jobsForHour(h)).toContain('/api/cron/heartbeat');
  });

  it('keeps the daily jobs at their vercel.json hours (UTC)', () => {
    expect(jobsForHour(2)).toEqual(['/api/cron/heartbeat', '/api/cron/care']);
    expect(jobsForHour(3)).toEqual(['/api/cron/heartbeat', '/api/cron/summary']);
    expect(jobsForHour(6)).toEqual(['/api/cron/heartbeat', '/api/cron/ping']);
    expect(jobsForHour(7)).toEqual(['/api/cron/heartbeat', '/api/cron/notify']);
    expect(jobsForHour(8)).toEqual(['/api/cron/heartbeat', '/api/cron/scorecard']);
  });

  it('runs only the heartbeat in the other hours', () => {
    expect(jobsForHour(5)).toEqual(['/api/cron/heartbeat']);
    expect(jobsForHour(23)).toEqual(['/api/cron/heartbeat']);
  });

  it('covers every daily cron in vercel.json', async () => {
    const { default: vercel } = await import('../vercel.json');
    const all = new Set(Array.from({ length: 24 }, (_, h) => jobsForHour(h)).flat());
    for (const c of vercel.crons) expect(all).toContain(c.path);
  });
});
