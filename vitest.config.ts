import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Merged onto the Vite config, not written from scratch.
 *
 * `src/content/index.test.ts` imports the real corpus, which means the MDX
 * plugin and the `@` alias both have to be in force. Restating them here would
 * be a second source of truth that drifts the first time `vite.config.ts`
 * changes.
 */
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }),
);
