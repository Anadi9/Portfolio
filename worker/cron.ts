/**
 * The Worker's one hourly Cron Trigger (`0 * * * *`), fanned out by UTC hour.
 *
 * The free plan allows 5 triggers and the site has 6 jobs, so one trigger runs
 * them all. The daily jobs keep the hours `vercel.json` gives them. The
 * heartbeat runs every hour, which is what Phase 4 intended (Vercel Hobby only
 * allowed daily crons, so cron-job.org was pinging it hourly).
 */

const DAILY: Record<number, string> = {
  2: '/api/cron/care',
  3: '/api/cron/summary',
  6: '/api/kit/ping',
  7: '/api/cron/notify',
  8: '/api/cron/scorecard',
};

export function jobsForHour(hour: number): string[] {
  const daily = DAILY[hour];
  return daily ? ['/api/cron/heartbeat', daily] : ['/api/cron/heartbeat'];
}
