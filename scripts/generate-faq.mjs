// Writes src/data/faq.generated.ts (FAQPage data from the notes' question
// headings). Runs in predev and prebuild; a test fails if it drifts.
import { writeFileSync } from 'node:fs';
import { faqModule } from './lib/faq.mjs';

writeFileSync('src/data/faq.generated.ts', faqModule());
console.log('[faq] src/data/faq.generated.ts');
