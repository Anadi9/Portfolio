// Writes src/data/nav.generated.ts (the header's Resources menu: newest posts
// per stream). Runs in predev and prebuild; a test fails if it drifts.
import { writeFileSync } from 'node:fs';
import { navModule } from './lib/nav.mjs';

writeFileSync('src/data/nav.generated.ts', navModule());
console.log('[nav] src/data/nav.generated.ts');
