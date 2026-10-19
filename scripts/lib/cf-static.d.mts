export type VercelJson = {
  redirects?: { source: string; destination: string; permanent?: boolean; has?: unknown }[];
  rewrites?: { source: string; destination: string }[];
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};
export function toCloudflareStatic(vercelJson: VercelJson): { headers: string; redirects: string; skipped: string[] };
export const SECURITY_HEADERS: Record<string, string>;
