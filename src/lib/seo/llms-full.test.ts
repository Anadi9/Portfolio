import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM build script, no types
import { mdxToText } from '../../../scripts/lib/llms.mjs';

const src = `---
title: Example
stream: fixes
---
import { Flow } from '../../components/Flow';

# Heading

Some **text** with a [link](/notes).

<Flow
  steps={['a', 'b']}
/>

<PromptLibrary />

\`\`\`ts
import { createClient } from '@supabase/supabase-js';
export const x = 1;
\`\`\`

<Callout>
Inside a callout.
</Callout>

Last line.
`;

describe('mdxToText', () => {
  it('keeps the prose and code, drops frontmatter, top-level imports and components', () => {
    const out: string = mdxToText(src);
    expect(out).not.toContain('title: Example');
    expect(out).not.toContain("import { Flow }");
    expect(out).not.toContain('<Flow');
    expect(out).not.toContain('steps=');
    expect(out).not.toContain('<PromptLibrary');
    expect(out).toContain('# Heading');
    expect(out).toContain('Some **text** with a [link](https://anadithakur.in/notes).');
    expect(out).toContain("import { createClient } from '@supabase/supabase-js';");
    expect(out).toContain('export const x = 1;');
    expect(out).toContain('Inside a callout.');
    expect(out).not.toContain('<Callout>');
    expect(out).toContain('Last line.');
    expect(out).not.toMatch(/\n{3,}/);
  });
});
