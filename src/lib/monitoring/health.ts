export type Status = 'configured' | 'missing';
export type HealthReport = {
  ok: boolean;
  checks: { resend: Status; supabase: Status; whatsapp: Status; ai: Status };
  supabaseReachable?: 'reachable' | 'unreachable';
};

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ status: number }>;

const has = (v: string | undefined) => typeof v === 'string' && v.length > 0;
const status = (b: boolean): Status => (b ? 'configured' : 'missing');

/** Env presence only, never values. Missing env is informational (`ok` stays true); a configured but unreachable Supabase makes `ok` false. */
export async function healthReport(env: Env, fetchImpl: FetchLike): Promise<HealthReport> {
  const supabase = has(env.SUPABASE_URL) && has(env.SUPABASE_SECRET_KEY);
  const report: HealthReport = {
    ok: true,
    checks: {
      resend: status(has(env.RESEND_API_KEY)),
      supabase: status(supabase),
      whatsapp: status(has(env.WHATSAPP_TOKEN) && has(env.WHATSAPP_PHONE_NUMBER_ID)),
      ai: status(env.BIT_AI === 'on' || has(env.AI_GATEWAY_API_KEY)),
    },
  };
  if (supabase) {
    try {
      const res = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: env.SUPABASE_SECRET_KEY as string },
        signal: AbortSignal.timeout(3000),
      });
      report.supabaseReachable = res.status < 500 ? 'reachable' : 'unreachable';
      if (report.supabaseReachable === 'unreachable') report.ok = false;
    } catch {
      report.supabaseReachable = 'unreachable';
      report.ok = false;
    }
  }
  return report;
}
