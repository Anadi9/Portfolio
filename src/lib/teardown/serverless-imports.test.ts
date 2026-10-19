import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A resolution guard for the one deployed function.
 *
 * `package.json` sets `"type": "module"`, and Vercel's Node builder transpiles
 * `api/teardown-report.ts` file by file rather than bundling it. The output is
 * therefore native ESM, and Node's ESM resolver — unlike Vite, esbuild and
 * vitest, all of which resolve these same files locally — refuses a relative
 * specifier without a file extension. An extensionless import here does not
 * fail a build, a test or a local run. It fails once, in production, as
 * ERR_MODULE_NOT_FOUND at cold start, taking every request with it.
 *
 * So the extensions are asserted rather than trusted. `.js` is correct on a
 * `.ts` source: it names the emitted file, which is what Node resolves.
 */

const ROOT = join(import.meta.dirname, '../../..');

/** Every module Node loads when the function cold-starts, function first. */
const GRAPH = [
  'api/[route].ts',
  'api/bit/[action].ts',
  'api/cron/[job].ts',
  'src/server/routes.ts',
  'src/server/teardown-report.ts',
  'src/server/rescue-audit.ts',
  'src/lib/rescue/intake.ts',
  'src/server/audit.ts',
  'src/lib/audit/intake.ts',
  'src/server/ai-readiness.ts',
  'src/lib/readiness/check.ts',
  'src/lib/readiness/analyze.ts',
  'src/lib/readiness/url.ts',
  'src/server/review.ts',
  'src/lib/review/intake.ts',
  'src/server/scan.ts',
  'src/lib/scan/validate.ts',
  'src/lib/scan/report.ts',
  'src/lib/scan/scan.ts',
  'src/lib/scan/rate-limit.ts',
  'src/lib/teardown/email.ts',
  'src/lib/teardown/document.ts',
  'src/lib/teardown/report.ts',
  'src/lib/teardown/score.ts',
  'src/lib/teardown/questions.ts',
  'src/server/production-kit-checkout.ts',
  'api/production-kit-download.ts',
  'api/stripe-webhook.ts',
  'src/lib/kit/stripe.ts',
  'src/lib/kit/archive-source.ts',
  'src/lib/kit/archive.ts',
  'src/lib/kit/email.ts',
  'src/lib/kit/product.ts',
  'src/server/kit-price.ts',
  'src/lib/kit/geo.ts',
  'src/server/client-error.ts',
  'src/server/event.ts',
  'src/server/health.ts',
  'src/lib/monitoring/validate.ts',
  'src/lib/monitoring/with-error-log.ts',
  'src/lib/monitoring/health.ts',
  'src/lib/bit/ai-env.ts',
  'src/lib/tickets/store.ts',
  'src/lib/tickets/types.ts',
  'src/lib/tickets/policy.ts',
  'src/server/bit/ticket.ts',
  'src/server/board.ts',
  'src/lib/tickets/board.ts',
  'src/server/cron/notify.ts',
  'src/server/cron/scorecard.ts',
  'src/server/scorecard.ts',
  'src/lib/scorecard/summary.ts',
  'src/lib/scorecard/headers.ts',
  'src/lib/notify/dispatch.ts',
  'src/lib/notify/email.ts',
  'src/lib/notify/whatsapp.ts',
  'src/lib/notify/ticket.ts',
  'src/lib/notify/timeout.ts',
  'api/kit/[action].ts',
  'src/lib/kit/handlers.ts',
  'src/lib/kit/fulfil.ts',
  'src/lib/kit/packs.ts',
  'src/lib/kit/store.ts',
  'src/lib/kit/tokens.ts',
  'src/data/kit/index.ts',
  'src/data/kit/types.ts',
  'src/data/kit/releases/1.2.1.ts',
  'src/data/kit/releases/1.2.0.ts',
  'src/server/bit/ask.ts',
  'src/lib/bit/ask-handler.ts',
  'src/lib/bit/ai.ts',
  'src/lib/bit/knowledge.ts',
  'src/lib/bit/nodes.ts',
  'src/lib/bit/stacks.ts',
  'src/lib/bit/prices.ts',
  'src/lib/bit/route.ts',
  'src/data/bitsQuestFacts.ts',
  'src/data/promises.ts',
  'src/lib/notify/live.ts',
  'src/server/admin.ts',
  'src/lib/admin/session.ts',
  'src/lib/admin/passkey.ts',
  'src/server/portal.ts',
  'src/lib/portal/view.ts',
  'src/lib/engine/types.ts',
  'src/lib/engine/adapters.ts',
  'src/lib/engine/combine.ts',
  'src/lib/engine/report.ts',
  'src/lib/money/invoices.ts',
  'src/lib/money/types.ts',
  'src/lib/feed/types.ts',
  'src/lib/coach/types.ts',
  'src/lib/coach/rules.ts',
  'src/lib/coach/stages.ts',
  'src/lib/coach/hooks.ts',
  'src/server/cron/heartbeat.ts',
  'src/server/cron/summary.ts',
  'src/server/cron/care.ts',
  'src/lib/command/numbers.ts',
  'src/lib/command/today.ts',
  'src/lib/command/plan.ts',
  'src/lib/command/push.ts',
  'src/data/plan.generated.ts',
  'src/lib/brief/background.ts',
  'src/lib/runtime/wait-until.ts',
  'src/lib/brief/process.ts',
  'src/lib/brief/scan.ts',
  'src/lib/brief/brief.ts',
  'src/lib/brief/draft.ts',
];

/** Relative specifiers only: bare ones are resolved from node_modules, not by path. */
const RELATIVE = /\bfrom\s+'(\.[^']*)'/g;

describe('serverless import graph: ESM resolvability', () => {
  it.each(GRAPH)('%s gives every relative import a file extension', (file) => {
    const source = readFileSync(join(ROOT, file), 'utf8');
    const specifiers = [...source.matchAll(RELATIVE)].map((m) => m[1]);

    for (const specifier of specifiers) {
      expect(specifier, `${file} imports '${specifier}' without an extension`).toMatch(/\.js$/);
    }
  });

  // `@/` is a Vite/tsconfig alias; Node has never heard of it. Type-only imports are erased, so they are fine.
  it.each(GRAPH)('%s has no runtime `@/` alias import', (file) => {
    const source = readFileSync(join(ROOT, file), 'utf8');
    const aliased = [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'(@\/[^']*)'/gm)].map((m) => m[1]);
    expect(aliased, `${file} imports ${aliased.join(', ')} through the @/ alias`).toEqual([]);
  });

  it('covers the whole graph: no listed module imports one that is missing', () => {
    const listed = new Set(GRAPH.map((f) => f.split('/').pop()!.replace(/\.ts$/, '')));
    for (const file of GRAPH) {
      const source = readFileSync(join(ROOT, file), 'utf8');
      for (const [, specifier] of source.matchAll(RELATIVE)) {
        expect(listed).toContain(specifier.split('/').pop()!.replace(/\.js$/, ''));
      }
    }
  });
});

/**
 * Vercel turns every file under `api/` into a deployed function, so a stray
 * test, fixture or helper there becomes a public endpoint. `teardown-report.test.ts`
 * was one: it answered `/api/teardown-report.test` with a 500 because it imports
 * `vitest`, a devDependency that does not exist at runtime.
 */
describe('api/ directory: deployable files only', () => {
  const entries = readdirSync(join(ROOT, 'api'));

  it('contains nothing but the function entrypoints', () => {
    expect([...entries].sort()).toEqual([
      '[route].ts',
      'bit',
      'cron',
      'kit',
      'production-kit-download.ts',
      'stripe-webhook.ts',
    ]);
  });

  it('contains no test files', () => {
    expect(entries.filter((f) => /\.test\.[cm]?[jt]sx?$/.test(f))).toEqual([]);
  });

  it.each([
    ['kit', '[action].ts'],
    ['bit', '[action].ts'],
    ['cron', '[job].ts'],
  ])('has only the one dispatcher in api/%s', (dir, file) => {
    expect(readdirSync(join(ROOT, 'api', dir))).toEqual([file]);
  });

  // The Hobby plan refuses a deployment with more than 12 functions, after the
  // build has passed, with nothing in the build log to say why.
  it('stays within the Hobby plan function limit', () => {
    const count = (dir: string): number =>
      readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(dir, e.name)) : 1), 0);
    expect(count(join(ROOT, 'api'))).toBeLessThanOrEqual(12);
  });
});
