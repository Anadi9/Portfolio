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
  'api/teardown-report.ts',
  'src/lib/teardown/email.ts',
  'src/lib/teardown/document.ts',
  'src/lib/teardown/report.ts',
  'src/lib/teardown/score.ts',
  'src/lib/teardown/questions.ts',
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

  it('contains nothing but the one function entrypoint', () => {
    expect(entries).toEqual(['teardown-report.ts']);
  });

  it('contains no test files', () => {
    expect(entries.filter((f) => /\.test\.[cm]?[jt]sx?$/.test(f))).toEqual([]);
  });
});
