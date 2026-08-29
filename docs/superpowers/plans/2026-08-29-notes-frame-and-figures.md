# Notes Frame and Figure Primitives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every notes route a three-track CSS grid with a left rail (in-page
navigation, read progress, relocated post meta) and a right gutter that figures
can bleed into, plus the figure primitives that make the bleed worth having.

**Architecture:** A remark plugin extracts each post's h2/h3 spine at build time
and exports it from the compiled MDX module, so the rail's table of contents is
in the prerendered HTML rather than discovered from the DOM after mount.
`Column` becomes a CSS grid with named lines (`rail` / `measure` / `bleed`);
prose keeps the 760px measure it has today and a figure opts into the wider
track with one declaration. Interactivity — scroll-spy, read progress, copy,
table sort — is added on hydration to markup that is already complete and
correct without it.

**Tech Stack:** React 18, TypeScript, Vite 5, `vite-react-ssg` 0.8.9,
`@mdx-js/rollup` 3, `remark-gfm`, `rehype-slug`, `github-slugger`,
`estree-util-value-to-estree`, Vitest (new).

**Spec:** `docs/superpowers/specs/2026-08-29-notes-frame-and-figures-design.md`

## Global Constraints

- **No GSAP and no Lenis on notes routes.** The notes chunk is ~5KB today.
  `src/hooks/use-portfolio-motion.ts` and anything importing it stay out.
- **No chart or diagram library.** Recharts is in `package.json` and is not to be
  imported by any file under `src/components/notes/` or `src/pages/Notes*`.
- **Static first.** Every figure, table, code block and TOC entry renders fully
  in the prerendered HTML. Hydration may add affordances; it may never be the
  only way to read or index content.
- **Code-drawn figures only.** No `<img>`, no new files under `public/`.
- **Design tokens only.** Colours, spacing, type and rule weights come from
  `@/components/portfolio/tokens` (`c`, `s`, `px`, `rule`, `label`, `heading`,
  `display`, `mono`). No raw hex outside `notes.css`, which already carries the
  `--fc-*` custom properties by necessity.
- **Hover affordances gate behind `@media (hover: hover)`**, matching the
  existing `.pf-feed-card` convention in `src/styles/notes.css`.
- **`prefers-reduced-motion: reduce`** disables the progress-rule transition.
- **The 760px measure does not change.** `MEASURE` in
  `src/components/notes/prose.tsx` stays at 760.
- **Commit after every task.** Conventional-commit prefixes, and every commit
  message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Deviations from the spec, decided while planning

Three. Each is a reduction in risk or diff, not in scope of outcome.

1. **Spec §5.4 `<Compare>` becomes an unconditional upgrade to `prose.table`.**
   An opt-in component would mean rewriting `cheatsheet.mdx`'s eight markdown
   pipe tables as JSX prop arrays, which destroys the source readability that
   made GFM tables the right choice in the first place. Instead `prose.table`
   parses the React children MDX hands it, extracts header text, emits
   `data-label` on every `<td>`, and renders its own sortable header. Every
   table on all twelve posts gets the card view and the sort for free, and
   `cheatsheet.mdx` needs no content edit at all. **Task 13 (cheatsheet
   retrofit) is therefore deleted from the plan.**
2. **Spec §5.2's filename tab reads the language class, not the fence meta.**
   `@mdx-js/mdx` does not forward a code fence's meta string to the element
   without an additional rehype plugin. `className="language-json"` is already
   there. The tab reads `JSON` rather than `workflow.json`.
3. **Spec §5.3 `<Flow>` is static, with CSS connectors.** Config text is always
   visible rather than revealed on tap, so the interactive layer would have had
   no job; nodes get hover/focus emphasis in CSS and no JavaScript. SVG
   connectors are replaced by CSS pseudo-elements — no viewBox arithmetic, and
   they reflow correctly when the row wraps to a column on a phone.

## New dependencies

All devDependencies. Five of the six are already in the tree transitively and
are only being promoted to direct so the imports are honest.

| Package | Why | Already transitive? |
|---|---|---|
| `vitest` | Test runner. The repo has none. | No — genuinely new |
| `github-slugger` | Slug parity with `rehype-slug`, which uses it | Yes, via `rehype-slug` |
| `estree-util-value-to-estree` | Build the `export const headings` estree | Yes, via `remark-mdx-frontmatter` |
| `unist-util-visit` | Walk the mdast tree | Yes, via the remark stack |
| `mdast-util-to-string` | Heading text extraction | Yes, via the remark stack |
| `@mdx-js/mdx` | `compile()` in the plugin's parity test | Yes, via `@mdx-js/rollup` |

## File structure

**Create:**

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test config, merged onto the Vite config so MDX resolves |
| `src/lib/remark-headings.mjs` | Remark plugin: mdast → `export const headings` |
| `src/lib/remark-headings.test.ts` | Slug-parity test against `rehype-slug` |
| `src/content/index.test.ts` | The real corpus has headings, ids are unique per post |
| `src/components/notes/Rail.tsx` | The left-gutter aside: stamp, TOC, progress, meta |
| `src/components/notes/useRail.ts` | `useActiveHeading` + `useReadProgress` |
| `src/components/notes/postMeta.ts` | `Post` → the rail's meta rows, per stream |
| `src/components/notes/postMeta.test.ts` | Per-stream row derivation |
| `src/components/notes/Figure.tsx` | `<figure>` + caption + source + `bleed` |
| `src/components/notes/CopyBlock.tsx` | `<pre>` with language tab, copy, collapse |
| `src/components/notes/ProseTable.tsx` | Parsed, sortable, card-view-capable table |
| `src/components/notes/proseTable.ts` | Pure parse/sort helpers for the above |
| `src/components/notes/proseTable.test.ts` | Parse and sort helpers |
| `src/components/notes/Flow.tsx` | Trigger → node → action diagram |
| `scripts/check-notes.mjs` | Assertions against the built `dist/` |

**Modify:**

| File | Change |
|---|---|
| `package.json` | Deps above, `test` and `check` scripts |
| `vite.config.ts` | Register `remarkHeadings` last in `remarkPlugins` |
| `src/data/notes.ts` | `Heading` type; `headings` on `Post` |
| `src/content/index.ts` | Thread `mod.headings` through `build()` |
| `src/components/notes/NotesShell.tsx` | `Column` → the grid frame |
| `src/components/notes/PostHeader.tsx` | Slim to eyebrow/date/H1/children |
| `src/components/notes/prose.tsx` | `pre` → `CopyBlock`, `table` → `ProseTable` |
| `src/components/notes/DropLayout.tsx` | Mount `Rail`; move meta out of header |
| `src/components/notes/WisdomLayout.tsx` | Mount `Rail` |
| `src/components/notes/DispatchLayout.tsx` | Mount `Rail` |
| `src/pages/NotesIndex.tsx` | Filter chips into the rail |
| `src/styles/notes.css` | Grid, rail, disclosure, table card view, flow |
| `src/content/drops/automate.mdx` | Five `<Flow>` diagrams |

---

### Task 1: Test harness

Nothing in this repo runs tests. Everything downstream assumes `npm test` works.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Test: `src/lib/harness.test.ts` (deleted at the end of this task)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` (single run) and `npm run test:watch`. Test files match
  `src/**/*.test.ts`, run in the `node` environment, with the Vite config's
  `@` alias and MDX plugin applied.

- [ ] **Step 1: Install the runner**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Write the config**

Create `vitest.config.ts`. It merges onto the existing Vite config rather than
restating it, so the `@` alias and the MDX plugin are shared — tests in later
tasks import `src/content/index.ts`, which only resolves if MDX compiles.

```ts
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
```

- [ ] **Step 3: Add the scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a throwaway test to prove the harness runs**

Create `src/lib/harness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Delete the throwaway and commit**

```bash
rm src/lib/harness.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "$(cat <<'EOF'
chore: add vitest

The repo had no test runner. The heading-extraction plugin landing next has a
real failure mode — slug drift against rehype-slug silently kills every TOC
link — and that needs a test, not a careful read.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The heading-extraction remark plugin

The one piece of this project with an algorithmic failure mode. `rehype-slug`
generates heading ids on the rehype side, after this plugin runs on mdast. If
the two disagree on a single slug, that TOC link is dead and nothing warns you.
`automate.mdx` repeats `Trigger`, `Steps` and `Setup notes` five times each, so
the duplicate-disambiguation suffixes (`-1`, `-2`, …) are exercised on day one.

**Files:**
- Create: `src/lib/remark-headings.mjs`
- Test: `src/lib/remark-headings.test.ts`

**Interfaces:**
- Consumes: `npm test` from Task 1.
- Produces: default export `remarkHeadings()`, a remark plugin. Compiled MDX
  modules gain `export const headings: { depth: 2 | 3; id: string; text: string }[]`
  in document order.

- [ ] **Step 1: Install the plugin's dependencies**

```bash
npm install --save-dev github-slugger estree-util-value-to-estree unist-util-visit mdast-util-to-string @mdx-js/mdx
```

- [ ] **Step 2: Write the failing parity test**

Create `src/lib/remark-headings.test.ts`. It compiles a fixture through the
*same* plugin stack `vite.config.ts` uses, then asserts every id the plugin
exported actually appears as an `id` in the compiled output — which is where
`rehype-slug` put it. That is the parity risk, tested directly rather than by
inspection.

```ts
import { compile } from '@mdx-js/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import remarkHeadings from './remark-headings.mjs';

const build = (mdx: string) =>
  compile(mdx, {
    remarkPlugins: [remarkGfm, remarkHeadings],
    rehypePlugins: [rehypeSlug],
  }).then((f) => String(f));

/** Pull the exported array back out of the compiled module source. */
const exported = (code: string) => {
  const match = /export const headings = (\[[\s\S]*?\]);/.exec(code);
  if (!match) throw new Error('no `headings` export in compiled output');
  return JSON.parse(match[1]) as { depth: number; id: string; text: string }[];
};

describe('remarkHeadings', () => {
  it('exports h2 and h3 in document order, ignoring h1 and h4', async () => {
    const code = await build(
      ['# Title', '## First section', '### A detail', '#### Ignored', '## Second section'].join('\n\n'),
    );

    expect(exported(code)).toEqual([
      { depth: 2, id: 'first-section', text: 'First section' },
      { depth: 3, id: 'a-detail', text: 'A detail' },
      { depth: 2, id: 'second-section', text: 'Second section' },
    ]);
  });

  it('disambiguates repeated headings the same way rehype-slug does', async () => {
    const code = await build(['## Trigger', '## Steps', '## Trigger', '## Trigger'].join('\n\n'));

    expect(exported(code).map((h) => h.id)).toEqual(['trigger', 'steps', 'trigger-1', 'trigger-2']);
  });

  it('agrees with rehype-slug on every id it exports', async () => {
    const code = await build(
      [
        '## Comment-to-DM lead capture',
        '### Trigger',
        '### Setup notes',
        '## Auto-repurpose new content',
        '### Trigger',
        '### Setup notes',
        '## `n8n` & Zapier — 100% parity?',
        '### Trigger',
      ].join('\n\n'),
    );

    for (const heading of exported(code)) {
      expect(code, `id ${heading.id} is missing from the compiled output`).toContain(
        `id: "${heading.id}"`,
      );
    }
  });

  it('flattens inline markup in the heading text', async () => {
    const code = await build('## The `useWhen` **line**');

    expect(exported(code)).toEqual([
      { depth: 2, id: 'the-usewhen-line', text: 'The useWhen line' },
    ]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/lib/remark-headings.test.ts`
Expected: FAIL — `Cannot find module './remark-headings.mjs'`.

- [ ] **Step 4: Write the plugin**

Create `src/lib/remark-headings.mjs`:

```js
import GithubSlugger from 'github-slugger';
import { valueToEstree } from 'estree-util-value-to-estree';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

/**
 * Exports each post's h2/h3 spine as `headings`, for the notes rail's TOC.
 *
 * The rail has to be in the prerendered HTML. Reading heading ids out of the
 * DOM after mount would mean the whole table of contents pops in on hydration
 * and never exists for a crawler — the same argument `DropLayout` already makes
 * about a page whose content is a file.
 *
 * The ids MUST match the ones `rehype-slug` writes onto the headings
 * themselves, or every link in the rail is dead and nothing complains. Parity
 * is bought by using the same library the same way: one `GithubSlugger` per
 * file, fed in document order, so the `-1` / `-2` suffixes on repeated headings
 * land identically. `automate.mdx` repeats `Trigger` five times, so this is
 * load-bearing rather than defensive.
 *
 * Registered LAST in `remarkPlugins` so the frontmatter plugins have already
 * consumed their node before this appends to `tree.children`.
 */
export default function remarkHeadings() {
  return (tree) => {
    const slugger = new GithubSlugger();
    const headings = [];

    visit(tree, 'heading', (node) => {
      if (node.depth !== 2 && node.depth !== 3) return;
      const text = toString(node);
      headings.push({ depth: node.depth, id: slugger.slug(text), text });
    });

    // Appended, not unshifted: `export const` order is irrelevant to the
    // importer, and staying off the front of the tree keeps this clear of
    // whatever the frontmatter plugins expect to find there.
    tree.children.push({
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExportNamedDeclaration',
              specifiers: [],
              source: null,
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: 'headings' },
                    init: valueToEstree(headings),
                  },
                ],
              },
            },
          ],
        },
      },
    });
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/remark-headings.test.ts`
Expected: PASS, 4 tests.

If the third test fails on a heading containing inline code, the mismatch is
`toString` on mdast versus hast. Do not paper over it with a normalisation
step — that recreates the drift this task exists to prevent. Fix by matching
`rehype-slug`'s input exactly.

- [ ] **Step 6: Commit**

```bash
git add src/lib/remark-headings.mjs src/lib/remark-headings.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: extract each post's h2/h3 spine at build time

Exports `headings` from every compiled MDX module so the notes rail's table of
contents renders server-side. Ids come from the same github-slugger, fed in the
same order, as rehype-slug — tested directly, because a drifted slug is a dead
link that nothing warns about.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Thread `headings` through the corpus

**Files:**
- Modify: `vite.config.ts:20-25`
- Modify: `src/data/notes.ts:88-99`
- Modify: `src/content/index.ts:4-7`, `src/content/index.ts:26-47`
- Test: `src/content/index.test.ts`

**Interfaces:**
- Consumes: the `headings` export from Task 2.
- Produces:
  - `export type Heading = { depth: 2 | 3; id: string; text: string }` from
    `src/data/notes.ts`.
  - `Post.headings: Heading[]` — always an array, never undefined.

- [ ] **Step 1: Register the plugin**

In `vite.config.ts`, import it and append it to `remarkPlugins` — last, after
`remarkGfm`:

```ts
import remarkHeadings from "./src/lib/remark-headings.mjs";
```

```ts
remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }], remarkGfm, remarkHeadings],
```

Extend the existing comment above the plugin block with a sentence on why
`remarkHeadings` runs last and why it exists — the file's comments already carry
that much reasoning per plugin and this one should match.

- [ ] **Step 2: Add the type**

In `src/data/notes.ts`, above `Post`:

```ts
/**
 * One entry in a post's rail TOC.
 *
 * Not frontmatter — nobody writes this by hand. `remark-headings` extracts it
 * from the body at build time, and `id` is guaranteed to match the id
 * `rehype-slug` put on the heading itself.
 */
export type Heading = { depth: 2 | 3; id: string; text: string };
```

And add the field to `Post` (not to `BaseFrontmatter` — it is derived, not
authored):

```ts
export type Post<F extends Frontmatter = Frontmatter> = F & {
  slug: string;
  path: string;
  /** The h2/h3 spine, in document order. Empty for a post with no headings. */
  headings: Heading[];
  Body: ComponentType<Record<string, unknown>>;
};
```

- [ ] **Step 3: Thread it through `build()`**

In `src/content/index.ts`, widen `MdxModule`:

```ts
type MdxModule = {
  default: Post['Body'];
  frontmatter?: Partial<Frontmatter>;
  headings?: Heading[];
};
```

Add `Heading` to the type import from `@/data/notes`, and in the returned object
inside `build()`:

```ts
      return {
        ...(fm as Frontmatter),
        slug,
        path: `/${dir}/${slug}`,
        // Not validated like `title`/`summary`/`date`: a post is allowed to
        // have no h2 at all, and the rail simply doesn't render a TOC.
        headings: mod.headings ?? [],
        Body: mod.default,
      } as Post;
```

- [ ] **Step 4: Write the corpus test**

Create `src/content/index.test.ts`. This runs against the real twelve posts, so
it catches a plugin that silently stopped exporting far better than a fixture
can.

```ts
import { describe, expect, it } from 'vitest';
import { posts } from './index';

describe('corpus headings', () => {
  it('has posts to check', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('gives every post a headings array', () => {
    for (const post of posts) {
      expect(Array.isArray(post.headings), `${post.path} has no headings array`).toBe(true);
    }
  });

  it('gives every heading a unique id within its post', () => {
    for (const post of posts) {
      const ids = post.headings.map((h) => h.id);
      expect(new Set(ids).size, `${post.path} has duplicate heading ids`).toBe(ids.length);
    }
  });

  it('extracts the repeated headings on automate with distinct ids', () => {
    const automate = posts.find((p) => p.path === '/drops/automate');
    expect(automate).toBeDefined();

    const triggers = automate!.headings.filter((h) => h.text === 'Trigger');
    expect(triggers.length).toBeGreaterThan(1);
    expect(new Set(triggers.map((h) => h.id)).size).toBe(triggers.length);
  });

  it('only ever emits depth 2 or 3', () => {
    for (const post of posts) {
      for (const heading of post.headings) {
        expect([2, 3]).toContain(heading.depth);
      }
    }
  });
});
```

Note: `automate.mdx` writes `#### Trigger` (depth 4) today, so the fourth test
will fail until you check the file. Read
`src/content/drops/automate.mdx` first: if the `Trigger` / `Steps` /
`Setup notes` subheadings are h4, change that test to assert on the five h2
workflow titles instead — do **not** change the MDX heading levels to make a
test pass, and do **not** widen the plugin to h4, which would put forty entries
in the rail.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, all of Task 2's and Task 3's tests.

- [ ] **Step 6: Verify the build still works**

Run: `npm run build`
Expected: completes; `dist/drops/system/index.html` exists and is non-empty.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts src/data/notes.ts src/content/index.ts src/content/index.test.ts
git commit -m "$(cat <<'EOF'
feat: carry heading spines onto Post

Registers remark-headings in the MDX pipeline and threads the export through
build() onto Post.headings. Derived, so it sits on Post rather than in
frontmatter, and it is not validated — a post with no h2 is legal and simply
gets no rail TOC.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The grid frame

`Column` becomes the grid. The rail track is zero-width until 1200px and nothing
is mounted into it yet, so **this task must produce no visible change at any
width.** That is what makes it independently reviewable: if the page looks
different, the grid is wrong.

**Files:**
- Modify: `src/components/notes/NotesShell.tsx:97-109`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `<Column wide?>` renders `div.pf-frame` (plus `.pf-frame--wide` when `wide`).
  - CSS named lines available to descendants: `rail`, `measure`, `bleed`, and
    the composite `measure-start / bleed-end`.
  - Class contract: `.pf-rail` occupies the rail track and spans all rows;
    `.pf-bleed` spans `measure-start / bleed-end`; everything else defaults to
    `measure`.
  - `--pf-header-h: 60px` declared on the shell, for sticky offsets.

- [ ] **Step 1: Write the grid CSS**

Append to `src/styles/notes.css`:

```css
/* --- the notes frame ----------------------------------------------------
   Three named tracks. `measure` is the 760px reading column and does not
   change; `rail` is the left gutter, zero-width until there is room for it;
   `bleed` is the right gutter, which holds nothing and exists only so a figure
   can escape the measure by declaring one grid-column.

   No `column-gap`: a gap applies between every pair of tracks including the
   outer 1fr gutters, which makes the arithmetic lie. The gutter between rail
   and measure is padding on the rail itself, and is included in `--rail`.

   Track total at 1200 and above: 252 + 760 + 188 = 1200. */
.pf-frame {
  --rail: 0px;
  --measure: 760px;
  --bleed: 0px;

  display: grid;
  grid-template-columns:
    [full-start] minmax(clamp(20px, 5vw, 40px), 1fr)
    [rail-start] var(--rail)
    [rail-end measure-start] minmax(0, var(--measure))
    [measure-end bleed-start] var(--bleed)
    [bleed-end] minmax(clamp(20px, 5vw, 40px), 1fr) [full-end];
  padding-block: 72px 88px;
}

/* The index's feed is wider than a reading column — a 760px measure gives a
   feed headline about 320px beside its payload plate and turns every title
   into five lines. Same tracks, one number. */
.pf-frame--wide {
  --measure: 872px;
}

.pf-frame > * {
  grid-column: measure;
  min-width: 0;
}

@media (min-width: 1200px) {
  .pf-frame {
    --rail: 252px;
    --bleed: 188px;
  }
}

/* Hairlines at the track boundaries. The header and footer rules are
   full-bleed, which promises a grid; without these the margins read as two
   columns that failed to render rather than as margin. */
@media (min-width: 1200px) {
  .pf-frame::before,
  .pf-frame::after {
    content: '';
    grid-row: 1 / -1;
    border-left: 1.5px solid rgba(10, 10, 10, 0.14);
    pointer-events: none;
  }
  .pf-frame::before {
    grid-column: measure-start / measure-start;
  }
  .pf-frame::after {
    grid-column: bleed-end / bleed-end;
  }
}
```

- [ ] **Step 2: Point `Column` at it**

In `src/components/notes/NotesShell.tsx`, replace the `Column` component. Keep
the existing doc comment's reasoning about `wide`, and extend it to say the
padding and gutters now live in CSS because the grid needs named lines that an
inline style cannot declare.

```tsx
export const Column = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
  <div className={wide ? 'pf-frame pf-frame--wide' : 'pf-frame'}>{children}</div>
);
```

`MEASURE` is still imported by `NotesShell` for the footer and by `OnRamp` for
`NextUp` — leave both alone. Neither is inside the frame.

- [ ] **Step 3: Declare the header height**

In `NotesShell`, add `['--pf-header-h' as string]: '60px'` to the outermost
`div`'s style object, with a one-line comment that the rail's sticky offset
measures against it.

- [ ] **Step 4: Verify no visual change**

Run: `npm run dev`

Open `/notes`, `/drops/system`, `/wisdom/ai-wrapper-tell` and
`/dispatch/claudeforce` at 1600px, 1280px, 1024px and 375px. Expected: identical
to `main` at every width except the two new hairlines at ≥1200px. In particular
the index feed is still 1060px wide and post prose is still 760px.

- [ ] **Step 5: Verify the build**

Run: `npm run build && npm run preview`
Expected: build succeeds; the same four pages render as above.

- [ ] **Step 6: Commit**

```bash
git add src/components/notes/NotesShell.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
refactor: notes Column becomes a three-track grid

Named lines for rail / measure / bleed. The measure is unchanged at 760 (872 on
the index), the rail track is zero-width below 1200 and nothing is mounted into
it yet, so this is a no-op visually apart from the boundary hairlines. Those
exist because the header and footer rules are full-bleed and were promising a
grid the page did not have.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The rail — TOC and read progress

**Files:**
- Create: `src/components/notes/useRail.ts`
- Create: `src/components/notes/Rail.tsx`
- Modify: `src/styles/notes.css`
- Modify: `src/components/notes/DropLayout.tsx`, `WisdomLayout.tsx`, `DispatchLayout.tsx`

**Interfaces:**
- Consumes: `Post.headings` (Task 3); `.pf-rail` grid contract (Task 4).
- Produces:
  - `useActiveHeading(ids: string[]): string | null`
  - `useReadProgress(): number` — 0 to 1
  - `<Rail stamp={string} headings={Heading[]}>{children}</Rail>` — `children`
    is the meta block, mounted in Task 6; `Rail` renders nothing for it yet
    beyond a slot.

- [ ] **Step 1: Write the hooks**

Create `src/components/notes/useRail.ts`:

```ts
import { useEffect, useState } from 'react';

/**
 * Which heading the reader is currently under.
 *
 * IntersectionObserver rather than a scroll handler doing getBoundingClientRect
 * in a loop: the notes routes carry no scroll engine at all — no GSAP, no Lenis
 * — and this is not the place to reintroduce one.
 *
 * The bottom margin of -70% means a heading counts as "current" from the moment
 * it reaches the top band of the viewport until the next one does, rather than
 * flickering between two whenever both are on screen.
 */
export const useActiveHeading = (ids: string[]): string | null => {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order, so the topmost visible heading wins rather than
        // whichever one the observer happened to report last.
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
};

/** How far down the document the reader is, 0 to 1. */
export const useReadProgress = (): number => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return progress;
};
```

- [ ] **Step 2: Write the rail**

Create `src/components/notes/Rail.tsx`:

```tsx
import type { ReactNode } from 'react';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import type { Heading } from '@/data/notes';
import { useActiveHeading, useReadProgress } from './useRail';

/**
 * The left gutter on a post.
 *
 * Deliberately one rail and not two. `NotesShell` already argues that a column
 * of chrome before the first sentence is an interruption; two of them box the
 * measure in on both sides and turn a personal site into documentation
 * software. The right gutter stays empty on purpose — it is bleed room for
 * figures, not a second slab.
 *
 * Everything here renders server-side. The scroll-spy and the progress rule are
 * added on hydration; without JavaScript this is still a complete, working list
 * of anchors into the document.
 */
const Rail = ({
  stamp,
  headings,
  children,
}: {
  stamp: string;
  headings: Heading[];
  children?: ReactNode;
}) => {
  const active = useActiveHeading(headings.map((h) => h.id));
  const progress = useReadProgress();

  return (
    <aside className="pf-rail">
      <p style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[5]) }}>{stamp}</p>

      {headings.length > 0 && (
        <>
          <div className="pf-rail-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>

          <nav aria-label="On this page" style={{ margin: px(s[5], 0, s[7]) }}>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {headings.map((heading) => (
                <li key={heading.id} style={{ paddingLeft: heading.depth === 3 ? s[4] : 0 }}>
                  <a
                    href={`#${heading.id}`}
                    className="pf-rail-link"
                    aria-current={active === heading.id ? 'true' : undefined}
                    style={{
                      display: 'block',
                      padding: px(s[2], 0),
                      font: `500 ${heading.depth === 3 ? 11 : 12}px/1.35 ${mono}`,
                      letterSpacing: '0.02em',
                      textDecoration: 'none',
                    }}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </>
      )}

      {children && (
        <div style={{ paddingTop: s[6], borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}>{children}</div>
      )}
    </aside>
  );
};

export default Rail;
```

- [ ] **Step 3: Style it**

Append to `src/styles/notes.css`:

```css
/* --- the rail -----------------------------------------------------------
   Hidden below 1200px, where the grid gives it no track. Task 7 puts the same
   content behind a <details> disclosure for those widths. */
.pf-rail {
  display: none;
}

@media (min-width: 1200px) {
  .pf-rail {
    display: block;
    grid-column: rail;
    grid-row: 1 / -1;
    align-self: start;
    position: sticky;
    top: calc(var(--pf-header-h, 60px) + 24px);
    padding-right: 32px;
    max-height: calc(100vh - var(--pf-header-h, 60px) - 48px);
    overflow-y: auto;
  }
}

.pf-rail-progress {
  height: 2px;
  background: rgba(10, 10, 10, 0.14);
}
.pf-rail-progress span {
  display: block;
  height: 100%;
  background: #8a6a2a;
  transform-origin: left center;
  transition: transform 0.12s linear;
}

.pf-rail-link {
  color: #6b6b6b;
  border-left: 1.5px solid transparent;
  margin-left: -9px;
  padding-left: 9px !important;
  transition: color 0.18s ease, border-color 0.18s ease;
}
.pf-rail-link[aria-current='true'] {
  color: #0a0a0a;
  border-left-color: #8a6a2a;
}
.pf-rail-link:focus-visible {
  color: #0a0a0a;
  border-left-color: #0a0a0a;
}
@media (hover: hover) {
  .pf-rail-link:hover {
    color: #0a0a0a;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pf-rail-progress span,
  .pf-rail-link {
    transition: none;
  }
}

/* Anchored headings must clear the sticky header when jumped to. */
.pf-frame :is(h2, h3)[id] {
  scroll-margin-top: calc(var(--pf-header-h, 60px) + 24px);
}
```

- [ ] **Step 4: Mount it in the three layouts**

In each of `DropLayout.tsx`, `WisdomLayout.tsx` and `DispatchLayout.tsx`, import
`Rail` and `payloadOf`, and place the rail as the **first child of `<Column>`**,
before `<PostHeader>`:

```tsx
<Rail stamp={payloadOf(post).stamp} headings={post.headings} />
```

It is a grid item spanning all rows, so its position in source order does not
affect layout — first is where a reader tabbing through the page should meet it.

- [ ] **Step 5: Verify**

Run: `npm run dev`

At 1600px on `/drops/system`: the rail shows `SYSTEM` and eleven section links;
scrolling moves the active marker down and fills the progress rule; clicking a
link jumps to that section with the heading clear of the sticky header. At
1024px the rail is gone and the page is unchanged from Task 4. Tab through the
rail — every link takes focus with a visible marker.

On `/dispatch/claudeforce`, whose body has few headings, confirm the rail
renders the stamp and simply omits the nav if `headings` is empty.

- [ ] **Step 6: Verify the anchors survive the build**

Run: `npm run build`

```bash
grep -c 'class="pf-rail"' dist/drops/system/index.html
grep -o 'href="#[^"]*"' dist/drops/system/index.html | head
```

Expected: the rail is present in the static HTML with its anchors, not injected
on hydration.

- [ ] **Step 7: Commit**

```bash
git add src/components/notes/useRail.ts src/components/notes/Rail.tsx src/components/notes/DropLayout.tsx src/components/notes/WisdomLayout.tsx src/components/notes/DispatchLayout.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: notes rail with in-page nav and read progress

Fills the left gutter on post routes with the h2/h3 spine, an active marker and
a progress rule. Rendered server-side and functional without JavaScript;
IntersectionObserver only adds the active state, so the notes chunk stays free
of GSAP and Lenis.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Move the post meta into the rail

`PostHeader` currently stacks eyebrow, date, `LAST VERIFIED`, `USE WHEN`,
`YOU GET`, standfirst and a download button before the first sentence.

**Files:**
- Create: `src/components/notes/postMeta.ts`
- Test: `src/components/notes/postMeta.test.ts`
- Modify: `src/components/notes/PostHeader.tsx`
- Modify: `src/components/notes/DropLayout.tsx`

**Interfaces:**
- Consumes: `<Rail>`'s `children` slot (Task 5).
- Produces: `metaRowsOf(post: Post): { tag: string; value: string }[]`.

- [ ] **Step 1: Write the failing test**

Create `src/components/notes/postMeta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DispatchPost, DropPost, WisdomPost } from '@/data/notes';
import { metaRowsOf } from './postMeta';

const base = { slug: 's', path: '/p/s', headings: [], Body: () => null, title: 't', summary: 'x', useWhen: 'w', date: '2026-08-29' };

describe('metaRowsOf', () => {
  it('gives a drop its artifact, keyword and format', () => {
    const rows = metaRowsOf({
      ...base, stream: 'drop', artifact: '9-section template', format: 'both', keyword: 'SYSTEM',
    } as DropPost);

    expect(rows).toEqual([
      { tag: 'YOU GET', value: '9-section template' },
      { tag: 'FORMAT', value: 'ON PAGE + PDF' },
      { tag: 'DM KEYWORD', value: 'SYSTEM' },
    ]);
  });

  it('appends LAST VERIFIED when the post carries one', () => {
    const rows = metaRowsOf({
      ...base, stream: 'drop', artifact: 'a', format: 'inline', keyword: 'K', lastVerified: '2026-08-29',
    } as DropPost);

    expect(rows.at(-1)).toEqual({ tag: 'LAST VERIFIED', value: '29 AUG 2026' });
  });

  it('gives wisdom nothing but its verification stamp', () => {
    expect(metaRowsOf({ ...base, stream: 'wisdom', moves: [], tradeoff: 't' } as WisdomPost)).toEqual([]);
  });

  it('gives a dispatch its item count', () => {
    const rows = metaRowsOf({
      ...base, stream: 'dispatch', dateline: 'd', items: [{ headline: 'a', why: 'b' }, { headline: 'c', why: 'd' }],
    } as DispatchPost);

    expect(rows).toEqual([{ tag: 'IN THIS ONE', value: '2 claims' }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/notes/postMeta.test.ts`
Expected: FAIL — cannot resolve `./postMeta`.

- [ ] **Step 3: Write it**

Create `src/components/notes/postMeta.ts`:

```ts
import { formatChip } from './streamPayload';
import type { DispatchPost, DropPost, Post } from '@/data/notes';

export type MetaRow = { tag: string; value: string };

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
    .replace(/^0/, '');

/**
 * The secondary meta, for the rail.
 *
 * All of this used to sit in `PostHeader`, which meant a reader met six lines
 * of apparatus before the first sentence of the article. It is genuinely useful
 * — a drop's keyword is what the Instagram DM automation answers — but it is
 * reference, not the lede, and reference belongs in the margin.
 *
 * Wisdom gets nothing: its tradeoff is the stream's signature block and stays
 * in the body where the argument is.
 */
export const metaRowsOf = (post: Post): MetaRow[] => {
  const rows: MetaRow[] = [];

  if (post.stream === 'drop') {
    const drop = post as DropPost;
    rows.push({ tag: 'YOU GET', value: drop.artifact });
    const chip = formatChip(drop);
    if (chip) rows.push({ tag: 'FORMAT', value: chip });
    rows.push({ tag: 'DM KEYWORD', value: drop.keyword });
  }

  if (post.stream === 'dispatch') {
    const count = (post as DispatchPost).items.length;
    rows.push({ tag: 'IN THIS ONE', value: `${count} claim${count === 1 ? '' : 's'}` });
  }

  if (post.lastVerified) rows.push({ tag: 'LAST VERIFIED', value: fmtDate(post.lastVerified) });

  return rows;
};
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/components/notes/postMeta.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Render the rows in the rail**

In `Rail.tsx`, the `children` slot already exists. In each of the three layouts,
pass the rows in:

```tsx
<Rail stamp={payloadOf(post).stamp} headings={post.headings}>
  {metaRowsOf(post).map((row) => (
    <div key={row.tag} style={{ marginBottom: s[4] }}>
      <p style={{ ...label(9, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[1]) }}>{row.tag}</p>
      <p style={{ margin: 0, font: `500 12px/1.5 ${mono}`, color: c.ink }}>{row.value}</p>
    </div>
  ))}
</Rail>
```

In `DropLayout.tsx` only, move the download anchor out of `PostHeader`'s
children and append it inside the rail's children, after the rows. Keep the
`pf-nudge` class and the existing `format !== 'inline' && downloadHref` guard;
drop `marginTop: s[7]` to `s[4]` and let it fill the rail's width
(`display: 'block'`, `textAlign: 'center'`).

- [ ] **Step 6: Slim `PostHeader`**

Remove the `lastVerified` span from `PostHeader.tsx` — it is a rail row now.
Update the doc comment: the header's job is the eyebrow, the date, the H1 and
whatever lede the layout passes as children; reference meta lives in the rail.

In `DropLayout.tsx`, delete the `<MetaLine tag="YOU GET">` line. `USE WHEN` and
`Standfirst` stay in all three layouts — they are the lede, not apparatus.

- [ ] **Step 7: Verify**

Run: `npm run dev`

`/drops/prompts` at 1600px: the rail shows `PROMPTS`, the TOC, then YOU GET /
FORMAT / DM KEYWORD and a full-width download button. The header above the
article is now eyebrow, date, H1, USE WHEN, standfirst — five lines, not eight.

**At 1024px the rail is hidden, which means the download button is currently
unreachable on a phone.** That is fixed in Task 7 and must not be left
uncommitted past it — note it in the commit message so a reviewer stopping here
knows.

- [ ] **Step 8: Commit**

```bash
git add src/components/notes/postMeta.ts src/components/notes/postMeta.test.ts src/components/notes/PostHeader.tsx src/components/notes/Rail.tsx src/components/notes/DropLayout.tsx src/components/notes/WisdomLayout.tsx src/components/notes/DispatchLayout.tsx
git commit -m "$(cat <<'EOF'
refactor: post reference meta moves to the rail

YOU GET, FORMAT, DM KEYWORD, LAST VERIFIED and the download button leave the
header for the margin, cutting the apparatus above the first sentence from
eight lines to five.

Known gap, closed in the next commit: the rail is hidden below 1200px, so the
download link has no mobile home until the CONTENTS disclosure lands.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: The mobile disclosure

Below 1200px the rail has no track. Its contents become a closed `<details>`
under the sticky header. Static HTML, no JavaScript, and it is what
`/drops/prompts` needs most on a phone.

**Files:**
- Modify: `src/components/notes/Rail.tsx`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: everything from Tasks 5 and 6.
- Produces: no new exports. `<Rail>` renders one DOM tree that presents as an
  aside at ≥1200px and as a `<details>` below it.

- [ ] **Step 1: Restructure `Rail` around `<details>`**

Render `<details className="pf-rail" open={false}>` with a `<summary>` carrying
the stamp and the word `CONTENTS`, and the existing nav and meta as its body.
One DOM tree, not two — a duplicated tree would put every heading anchor in the
page twice and hand a crawler two of everything.

At ≥1200px CSS forces the disclosure open and hides the summary:

```css
@media (min-width: 1200px) {
  .pf-rail > summary {
    display: none;
  }
}
```

A `<details>` with `display: none` on its summary still needs `open` to show its
body, so `Rail` sets `open` from a `useState` that starts `false` and is flipped
to `true` on mount by a `matchMedia('(min-width: 1200px)')` check — with the
listener kept, so a resize across the breakpoint is handled. The initial
server-rendered state is closed, and the closed body is still in the HTML, so
nothing is hidden from a crawler either way.

- [ ] **Step 2: Style the mobile presentation**

```css
/* Below 1200 the rail has no track, so it becomes a disclosure under the
   sticky header. Same DOM: duplicating it would put every heading anchor in
   the page twice. */
.pf-rail {
  display: block;
  grid-column: measure;
  margin-bottom: 36px;
  border: 2px solid #0a0a0a;
}
.pf-rail > summary {
  cursor: pointer;
  padding: 12px 16px;
  background: #e4ded0;
  font: 700 10px/1 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.14em;
  list-style: none;
}
.pf-rail > summary::-webkit-details-marker {
  display: none;
}
.pf-rail > .pf-rail-body {
  padding: 16px;
}

@media (min-width: 1200px) {
  .pf-rail {
    grid-column: rail;
    grid-row: 1 / -1;
    align-self: start;
    position: sticky;
    top: calc(var(--pf-header-h, 60px) + 24px);
    padding-right: 32px;
    margin-bottom: 0;
    border: 0;
    max-height: calc(100vh - var(--pf-header-h, 60px) - 48px);
    overflow-y: auto;
  }
  .pf-rail > .pf-rail-body {
    padding: 0;
  }
}
```

Delete the `display: none` rule from Task 5 — this replaces it.

- [ ] **Step 3: Verify**

Run: `npm run dev`

At 375px on `/drops/prompts`: a `CONTENTS` bar sits above the article, closed;
opening it lists every section and the download button; tapping a section jumps
there with the heading clear of the sticky header. At 1600px it is the rail
again with no summary visible. Resize across 1200px in both directions and
confirm it does not get stuck closed.

- [ ] **Step 4: Verify the closed body is still in the HTML**

Run: `npm run build`

```bash
grep -c 'DM KEYWORD' dist/drops/system/index.html
```

Expected: at least 1. A closed `<details>` keeps its contents in the DOM; this
confirms nothing was moved behind a client-only branch.

- [ ] **Step 5: Commit**

```bash
git add src/components/notes/Rail.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: rail becomes a CONTENTS disclosure below 1200px

One DOM tree presented two ways, rather than a duplicate that would put every
heading anchor in the page twice. Closes the mobile gap the previous commit
opened: the download button is reachable on a phone again.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Filter chips into the index rail

The chips currently sit above the feed and scroll away after two rows.

**Files:**
- Modify: `src/pages/NotesIndex.tsx`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: the `.pf-rail` contract (Tasks 5 and 7).
- Produces: nothing new. `NotesIndex` reuses `.pf-rail` / `.pf-rail-body`
  directly rather than `<Rail>` — it has no headings and no post, and passing a
  fake `Post` to reuse a component is worse than sharing the two class names.

- [ ] **Step 1: Move the chips**

In `NotesIndex.tsx`, wrap the existing chip `<div>` in the same
`<details className="pf-rail">` / `<summary>FILTER</summary>` /
`<div className="pf-rail-body">` structure, placed as the first child of
`<Column wide>`. Change the chip container's flex direction to `column` and drop
`borderBottom` — the rail's own border does that job now.

Keep the `filter` state, `aria-pressed`, and the counts exactly as they are.
Keep `StartHere` and the feed in the measure track.

Extract the `matchMedia` open-state logic from `Rail.tsx` into `useRail.ts` as
`useDisclosureOpen(query = '(min-width: 1200px)')` and use it in both places,
rather than writing it twice.

- [ ] **Step 2: Keep the feed's width**

The feed `<ol>` should span `measure-start / bleed-end` so the index keeps
today's full 1060px at wide viewports rather than losing 188px to a gutter that
holds nothing on this page. Add:

```css
.pf-frame--wide > ol {
  grid-column: measure-start / bleed-end;
}
```

`StartHere` stays in `measure` — three tiles across 872px is already the right
density and stretching them adds nothing.

- [ ] **Step 3: Verify**

Run: `npm run dev`

`/notes` at 1600px: chips are a sticky column on the left with their counts;
scrolling the feed keeps them in view; clicking one filters as before and the
pressed state is unchanged. At 375px they are a `FILTER` disclosure above
`START HERE`. Confirm the empty-stream message still renders when a chip with a
zero count is selected — add a `draft: true` post locally to test it if no
stream is empty, then revert.

- [ ] **Step 4: Verify prerender**

Run: `npm run build`

```bash
grep -c 'aria-pressed' dist/notes/index.html
```

Expected: 4 — one per chip, all in the static HTML.

- [ ] **Step 5: Commit**

```bash
git add src/pages/NotesIndex.tsx src/components/notes/useRail.ts src/components/notes/Rail.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: index filter chips move into the rail

They used to scroll away after the first two feed rows. Sticky in the left
gutter at wide widths, a FILTER disclosure below 1200px, same state and same
counts.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: The `<Figure>` primitive

**Files:**
- Create: `src/components/notes/Figure.tsx`
- Modify: `src/styles/notes.css`
- Modify: `src/components/notes/prose.tsx`

**Interfaces:**
- Consumes: the `bleed` grid contract (Task 4).
- Produces:
  `<Figure caption?: string; source?: string; bleed?: boolean>{children}</Figure>`,
  exported as `Figure` from `prose.tsx`'s components map under the key `Figure`
  so MDX can use it without an import.

- [ ] **Step 1: Write it**

Create `src/components/notes/Figure.tsx`:

```tsx
import type { ReactNode } from 'react';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';

/**
 * The container every figure sits in.
 *
 * `bleed` is the whole reason the right gutter exists. A comparison table or a
 * five-node workflow chain does not fit the 760px reading measure, and the
 * alternative — the `overflow-x: auto` box the tables use today — makes the
 * reader scroll a sub-region sideways to see the payload of the page.
 *
 * The caption is mono and small on purpose: it matches `MetaLine`, so a figure
 * reads as part of the same document rather than as an embed.
 */
const Figure = ({
  caption,
  source,
  bleed,
  children,
}: {
  caption?: string;
  source?: string;
  bleed?: boolean;
  children: ReactNode;
}) => (
  <figure className={bleed ? 'pf-figure pf-bleed' : 'pf-figure'} style={{ margin: px(0, 0, s[8]) }}>
    {children}
    {(caption || source) && (
      <figcaption style={{ marginTop: s[4], paddingTop: s[3], borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}>
        {caption && (
          <p style={{ margin: 0, font: `500 12px/1.5 ${mono}`, letterSpacing: '0.03em', color: c.dim }}>
            <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper, marginRight: s[3] }}>FIG</span>
            {caption}
          </p>
        )}
        {source && (
          <p style={{ margin: px(s[2], 0, 0), font: `500 11px/1.5 ${mono}`, color: c.dim }}>{source}</p>
        )}
      </figcaption>
    )}
  </figure>
);

export default Figure;
```

- [ ] **Step 2: Add the bleed rule**

```css
/* The one declaration the right gutter exists for. */
.pf-bleed {
  grid-column: measure-start / bleed-end;
}
```

- [ ] **Step 3: Expose it to MDX**

In `prose.tsx`, import `Figure` and add `Figure` to the exported `prose` object.
Note in the map's doc comment that capitalised keys are components MDX authors
call by name, as distinct from the lowercase element overrides.

- [ ] **Step 4: Verify**

Add a temporary `<Figure caption="test" bleed><div style={{height:120,background:'#E4DED0'}} /></Figure>`
to `src/content/drops/system.mdx`, run `npm run dev`, and confirm at 1600px that
it extends 188px past the right edge of the prose while the caption sits under
it. Revert the MDX change before committing.

- [ ] **Step 5: Commit**

```bash
git add src/components/notes/Figure.tsx src/components/notes/prose.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: add the Figure primitive

Captioned container with an optional source line and a `bleed` flag that spans
the measure and the right gutter. Every other figure in this pass composes into
it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `<CopyBlock>`

Every JSON skeleton on `automate` and `workflow` exists to be copied and there
is no copy button. Replacing the `pre` entry in the prose map means all eleven
existing code blocks across the corpus gain one with no content edit.

**Files:**
- Create: `src/components/notes/CopyBlock.tsx`
- Modify: `src/components/notes/prose.tsx:88-104`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `<CopyBlock>` replaces `prose.pre`. Same `.pf-pre` class, so the
  existing `.pf-pre code` reset in `notes.css` keeps working.

- [ ] **Step 1: Write it**

Create `src/components/notes/CopyBlock.tsx`:

```tsx
import { isValidElement, useRef, useState, type ReactNode } from 'react';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';

const LANGUAGE = /language-(\w+)/;
const COLLAPSE_ABOVE = 24;

/** The fence's language, off the nested `<code>`'s className. */
const languageOf = (children: ReactNode): string | undefined => {
  if (!isValidElement<{ className?: string }>(children)) return undefined;
  return LANGUAGE.exec(children.props.className ?? '')?.[1]?.toUpperCase();
};

/**
 * Line count, for the collapse decision only.
 *
 * Read off the source string rather than the DOM because this has to be right
 * during server render, and there is no DOM there. It is reliable for MDX code
 * fences, whose children are a single string — no syntax highlighter is
 * installed to break that into spans. The copy path uses `textContent` instead,
 * which is correct whatever the tree turns out to be.
 */
const lineCount = (children: ReactNode): number => {
  if (!isValidElement<{ children?: ReactNode }>(children)) return 0;
  const inner = children.props.children;
  return typeof inner === 'string' ? inner.trimEnd().split('\n').length : 0;
};

/**
 * A code block you can actually take away.
 *
 * The five n8n workflow skeletons on `/drops/automate` are the artifact of that
 * page — the whole point is to paste them into your own instance — and until
 * now the only way to get one was to select it by hand.
 *
 * Collapse is a <details>, so the full text stays in the DOM open or closed.
 * A crawler sees every line either way, which is the same rule the rest of this
 * project runs on.
 */
const CopyBlock = ({ children }: { children?: ReactNode }) => {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const language = languageOf(children);
  const long = lineCount(children) > COLLAPSE_ABOVE;

  const copy = () => {
    const text = ref.current?.textContent ?? '';
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const block = (
    <pre
      ref={ref}
      className="pf-pre"
      style={{
        margin: 0,
        padding: s[6],
        background: c.plate,
        color: c.bright,
        font: `500 13px/1.6 ${mono}`,
        overflowX: 'auto',
      }}
    >
      {children}
    </pre>
  );

  return (
    <div style={{ margin: px(0, 0, s[6]), border: `${rule.base}px solid ${c.ink}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[2], s[4]),
          background: c.accent,
          borderBottom: `${rule.base}px solid ${c.ink}`,
        }}
      >
        <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper }}>{language ?? 'CODE'}</span>
        <button type="button" onClick={copy} className="pf-copy" style={{ ...label(10, 700, 0.12) }}>
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>

      {long ? (
        <details>
          <summary className="pf-copy-more" style={{ ...label(10, 700, 0.12) }}>
            SHOW ALL LINES
          </summary>
          {block}
        </details>
      ) : (
        block
      )}
    </div>
  );
};

export default CopyBlock;
```

- [ ] **Step 2: Style the controls**

```css
.pf-copy,
.pf-copy-more {
  background: transparent;
  border: 1.5px solid rgba(10, 10, 10, 0.45);
  color: #0a0a0a;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}
.pf-copy:focus-visible,
.pf-copy-more:focus-visible {
  background: #0a0a0a;
  color: #e4ded0;
}
@media (hover: hover) {
  .pf-copy:hover,
  .pf-copy-more:hover {
    background: #0a0a0a;
    color: #e4ded0;
  }
}
.pf-copy-more {
  display: block;
  width: 100%;
  text-align: center;
  border: 0;
  border-top: 1.5px solid rgba(10, 10, 10, 0.2);
  list-style: none;
}
.pf-copy-more::-webkit-details-marker {
  display: none;
}
details[open] > .pf-copy-more {
  border-bottom: 1.5px solid rgba(10, 10, 10, 0.2);
}
@media (prefers-reduced-motion: reduce) {
  .pf-copy,
  .pf-copy-more {
    transition: none;
  }
}
```

- [ ] **Step 3: Swap it into the prose map**

In `prose.tsx`, replace the `pre` entry with `pre: CopyBlock`. Keep the doc
comment's explanation of the `.pf-pre code` reset — it still applies — and add a
line saying the block is now wrapped rather than bare.

- [ ] **Step 4: Verify**

Run: `npm run dev`

`/drops/automate`: each of the five JSON skeletons has a `JSON` tab and a `COPY`
button; clicking copies the exact block and the label flips to `COPIED` for
about a second. The long skeletons show `SHOW ALL LINES` collapsed. Confirm the
inline-code chip styling elsewhere in the prose is unchanged, and that the code
inside a `<pre>` is still plain (the `.pf-pre code` reset).

Tab to a copy button and press Enter — it must work from the keyboard.

- [ ] **Step 5: Verify the text survives collapse**

Run: `npm run build`

```bash
grep -c 'n8n-nodes-base' dist/drops/automate/index.html
```

Expected: the same count as on `main` — collapsing must not remove a line from
the HTML. Compare against `git stash` + rebuild if unsure.

- [ ] **Step 6: Commit**

```bash
git add src/components/notes/CopyBlock.tsx src/components/notes/prose.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: code blocks get a language tab, a copy button and a collapse

Swapped into the prose map, so all eleven existing blocks across the corpus get
it with no content edit. Collapse is a <details> and the full text stays in the
DOM either way.

Language comes from the fence's className rather than its meta string —
@mdx-js/mdx does not forward meta without another rehype plugin, and a JSON tab
is worth less than the plugin would cost.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Responsive, sortable tables

`prose.table` sets `minWidth: 480` inside an `overflow-x: auto` box, so
`cheatsheet`'s eight comparison tables — the payload of that page — scroll
sideways on a phone. This replaces the opt-in `<Compare>` from spec §5.4: every
table on all twelve posts is upgraded, and no MDX changes.

**Files:**
- Create: `src/components/notes/proseTable.ts`
- Create: `src/components/notes/ProseTable.tsx`
- Test: `src/components/notes/proseTable.test.ts`
- Modify: `src/components/notes/prose.tsx:106-148`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `nodeText(node: ReactNode): string`
  - `parseTable(children: ReactNode): { headers: ReactNode[]; rows: ReactNode[][] } | null`
  - `sortRows(rows: ReactNode[][], column: number, direction: 'asc' | 'desc'): ReactNode[][]`
  - `<ProseTable>` replaces `prose.table`; `prose.th` and `prose.td` are deleted
    because `ProseTable` renders its own cells.

- [ ] **Step 1: Write the failing test**

Create `src/components/notes/proseTable.test.ts`:

```ts
import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { nodeText, parseTable, sortRows } from './proseTable';

const table = h(
  'table',
  null,
  h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', null, 'Price'))),
  h(
    'tbody',
    null,
    h('tr', null, h('td', null, 'Gemini'), h('td', null, '$3')),
    h('tr', null, h('td', null, 'Claude'), h('td', null, '$15')),
  ),
).props.children;

describe('nodeText', () => {
  it('flattens strings, numbers and nested elements', () => {
    expect(nodeText('plain')).toBe('plain');
    expect(nodeText(42)).toBe('42');
    expect(nodeText(h('strong', null, 'bold ', h('em', null, 'inner')))).toBe('bold inner');
  });

  it('returns empty for null and undefined', () => {
    expect(nodeText(null)).toBe('');
    expect(nodeText(undefined)).toBe('');
  });
});

describe('parseTable', () => {
  it('pulls headers and rows out of an MDX table', () => {
    const parsed = parseTable(table);
    expect(parsed).not.toBeNull();
    expect(parsed!.headers.map(nodeText)).toEqual(['Model', 'Price']);
    expect(parsed!.rows.map((r) => r.map(nodeText))).toEqual([
      ['Gemini', '$3'],
      ['Claude', '$15'],
    ]);
  });

  it('returns null for something that is not a table', () => {
    expect(parseTable(h('p', null, 'no'))).toBeNull();
  });
});

describe('sortRows', () => {
  it('sorts ascending by a column, comparing text', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 0, 'asc').map((r) => nodeText(r[0]))).toEqual(['Claude', 'Gemini']);
  });

  it('sorts descending', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 0, 'desc').map((r) => nodeText(r[0]))).toEqual(['Gemini', 'Claude']);
  });

  it('sorts numerically when every cell in the column parses as a number', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 1, 'asc').map((r) => nodeText(r[1]))).toEqual(['$3', '$15']);
  });

  it('does not mutate the input', () => {
    const parsed = parseTable(table)!;
    const before = parsed.rows.map((r) => nodeText(r[0]));
    sortRows(parsed.rows, 0, 'asc');
    expect(parsed.rows.map((r) => nodeText(r[0]))).toEqual(before);
  });
});
```

The numeric test matters: `cheatsheet`'s pricing tables are full of `$3` and
`$15`, and a plain string sort puts `$15` before `$3`, which is worse than not
sorting at all.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/components/notes/proseTable.test.ts`
Expected: FAIL — cannot resolve `./proseTable`.

- [ ] **Step 3: Write the helpers**

Create `src/components/notes/proseTable.ts`:

```ts
import { Children, isValidElement, type ReactNode } from 'react';

/** Every string in a React subtree, flattened. Used for labels and sorting. */
export const nodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
};

const childrenOfType = (node: ReactNode, type: string): ReactNode[] =>
  Children.toArray(node).filter((child) => isValidElement(child) && child.type === type);

const cellsOf = (row: ReactNode): ReactNode[] =>
  Children.toArray(isValidElement<{ children?: ReactNode }>(row) ? row.props.children : null)
    .filter((cell) => isValidElement(cell))
    .map((cell) => (isValidElement<{ children?: ReactNode }>(cell) ? cell.props.children : null));

/**
 * MDX's `<table>` children, as data.
 *
 * The alternative was an opt-in `<Compare columns={} rows={}>` in the MDX,
 * which would have meant rewriting the cheat sheet's eight pipe tables as JSX
 * arrays and losing the readable markdown that made GFM tables the right
 * choice. Parsing here upgrades every table on every post instead, and the
 * source files never change.
 *
 * Returns the cell contents as React nodes, not strings, so inline links, code
 * and emphasis inside a cell survive a sort intact.
 */
export const parseTable = (
  children: ReactNode,
): { headers: ReactNode[]; rows: ReactNode[][] } | null => {
  const [thead] = childrenOfType(children, 'thead');
  const [tbody] = childrenOfType(children, 'tbody');
  if (!thead || !tbody) return null;

  const [headerRow] = childrenOfType(
    isValidElement<{ children?: ReactNode }>(thead) ? thead.props.children : null,
    'tr',
  );
  if (!headerRow) return null;

  const headers = cellsOf(headerRow);
  const rows = childrenOfType(
    isValidElement<{ children?: ReactNode }>(tbody) ? tbody.props.children : null,
    'tr',
  ).map(cellsOf);

  return headers.length > 0 && rows.length > 0 ? { headers, rows } : null;
};

/** `$15` → 15, `1.2M` → null. Anything with no digits is not a number. */
const numeric = (text: string): number | null => {
  const match = /-?\d+(\.\d+)?/.exec(text.replace(/,/g, ''));
  if (!match) return null;
  return text.replace(/[\s$£€,%]/g, '').match(/^-?\d+(\.\d+)?$/) ? Number(match[0]) : null;
};

/**
 * Sort by one column, numerically where the whole column is numbers.
 *
 * The pricing tables on the cheat sheet are the reason: a string sort puts $15
 * above $3, which is a worse answer than the order the author chose.
 */
export const sortRows = (
  rows: ReactNode[][],
  column: number,
  direction: 'asc' | 'desc',
): ReactNode[][] => {
  const texts = rows.map((row) => nodeText(row[column] ?? ''));
  const numbers = texts.map(numeric);
  const allNumeric = numbers.every((n) => n !== null);

  const order = rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const result = allNumeric
        ? (numbers[a.i] as number) - (numbers[b.i] as number)
        : texts[a.i].localeCompare(texts[b.i], 'en');
      return direction === 'asc' ? result : -result;
    });

  return order.map((entry) => entry.row);
};
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/notes/proseTable.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the component**

Create `src/components/notes/ProseTable.tsx`. It renders a real `<table>` with
real `<th>`s carrying `aria-sort`, a `<button>` inside each `<th>` for the sort,
and `data-label` on every `<td>` for the card view. When `parseTable` returns
null it falls back to rendering `children` untouched inside the current
`overflow-x: auto` box — a malformed table must still render.

```tsx
import { useState, type ReactNode } from 'react';
import { c, label, px, rule, s, display } from '@/components/portfolio/tokens';
import { nodeText, parseTable, sortRows } from './proseTable';

type Sort = { column: number; direction: 'asc' | 'desc' } | null;

const ProseTable = ({ children }: { children?: ReactNode }) => {
  const parsed = parseTable(children);
  const [sort, setSort] = useState<Sort>(null);

  if (!parsed) {
    return (
      <div style={{ overflowX: 'auto', margin: px(0, 0, s[6]) }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      </div>
    );
  }

  const rows = sort ? sortRows(parsed.rows, sort.column, sort.direction) : parsed.rows;
  const labels = parsed.headers.map(nodeText);

  return (
    <div className="pf-table-wrap" style={{ margin: px(0, 0, s[6]) }}>
      <table className="pf-table" style={{ width: '100%', borderCollapse: 'collapse', border: `${rule.base}px solid ${c.ink}`, font: `400 15px/1.6 ${display}` }}>
        <thead>
          <tr>
            {parsed.headers.map((header, i) => {
              const on = sort?.column === i;
              return (
                <th
                  key={i}
                  scope="col"
                  aria-sort={on ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ textAlign: 'left', padding: 0, background: c.accent, borderBottom: `${rule.base}px solid ${c.ink}` }}
                >
                  <button
                    type="button"
                    className="pf-table-sort"
                    onClick={() =>
                      setSort(on && sort!.direction === 'asc' ? { column: i, direction: 'desc' } : { column: i, direction: 'asc' })
                    }
                    style={{ ...label(10, 700, 0.1) }}
                  >
                    {header}
                    <span aria-hidden="true">{on ? (sort!.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, ci) => (
                <td key={ci} data-label={labels[ci]} style={{ padding: px(s[3], s[4]), borderTop: `${rule.hair}px solid rgba(10,10,10,.2)`, verticalAlign: 'top' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProseTable;
```

- [ ] **Step 6: Style the card view**

```css
/* Above the breakpoint: an ordinary table that scrolls only if it must. */
.pf-table-wrap {
  overflow-x: auto;
}
.pf-table-sort {
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  background: transparent;
  border: 0;
  color: #0a0a0a;
  cursor: pointer;
}
.pf-table-sort:focus-visible {
  outline: 2px solid #0a0a0a;
  outline-offset: -2px;
}
@media (hover: hover) {
  .pf-table-sort:hover {
    background: rgba(10, 10, 10, 0.06);
  }
}

/* Below 640 a comparison table with a 480px floor makes the reader scroll a
   sub-region sideways to see the payload of the page. Each row becomes a
   labelled block instead — same DOM, same <table>, so the markup a crawler
   sees does not change. */
@media (max-width: 639px) {
  .pf-table,
  .pf-table tbody,
  .pf-table tr,
  .pf-table td {
    display: block;
    width: 100%;
  }
  .pf-table thead {
    display: none;
  }
  .pf-table tr {
    border-bottom: 2px solid #0a0a0a;
    padding: 8px 0;
  }
  .pf-table tr:last-child {
    border-bottom: 0;
  }
  .pf-table td {
    border-top: 0 !important;
    padding: 6px 16px !important;
  }
  .pf-table td::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 2px;
    font: 700 10px/1 'JetBrains Mono', ui-monospace, monospace;
    letter-spacing: 0.1em;
    color: #8a6a2a;
  }
}
```

- [ ] **Step 7: Swap it into the prose map**

In `prose.tsx`, replace the `table` entry with `ProseTable` and delete the `th`
and `td` entries — `ProseTable` renders its own cells and the old ones are now
unreachable. Update the map's doc comment: the sideways-scroll note is replaced
by the card view, and the reason the component parses its children belongs
there.

- [ ] **Step 8: Verify**

Run: `npm run dev`

`/drops/cheatsheet` at 1280px: all eight tables render as before, plus a sort
control in each header. Sort the price column and confirm `$3` comes before
`$15`. At 375px each row is a labelled card with no horizontal scroll anywhere
on the page. `/drops/swipe`'s 20-row index table and `/drops/system`'s three
tables behave the same.

Tab to a sort button and press Enter.

- [ ] **Step 9: Verify the markup**

Run: `npm run build`

```bash
grep -o '<table' dist/drops/cheatsheet/index.html | wc -l
grep -o 'data-label' dist/drops/cheatsheet/index.html | wc -l
```

Expected: 8 tables, and a `data-label` count equal to the total cell count. Real
tables in the static HTML, which is the whole SEO argument for that page.

- [ ] **Step 10: Commit**

```bash
git add src/components/notes/proseTable.ts src/components/notes/ProseTable.tsx src/components/notes/proseTable.test.ts src/components/notes/prose.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: tables get a card view on mobile and sortable columns

Replaces the opt-in <Compare> the spec called for. Parsing MDX's table children
here upgrades every table on all twelve posts instead of eight on one, and the
markdown source files stay readable pipe tables rather than JSX prop arrays.

Sorting is numeric where the whole column parses as numbers — a string sort put
$15 above $3 on the cheat sheet's pricing tables, which is worse than the order
the author chose.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `<Flow>`

**Files:**
- Create: `src/components/notes/Flow.tsx`
- Modify: `src/components/notes/prose.tsx`
- Modify: `src/styles/notes.css`

**Interfaces:**
- Consumes: `<Figure>` (Task 9).
- Produces: `<Flow caption?: string; nodes: FlowNode[]>` where
  `FlowNode = { name: string; kind: 'trigger' | 'step' | 'action'; config?: string }`.
  Exposed on the prose map as `Flow`.

- [ ] **Step 1: Write it**

Create `src/components/notes/Flow.tsx`:

```tsx
import { c, display, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import Figure from './Figure';

export type FlowNode = { name: string; kind: 'trigger' | 'step' | 'action'; config?: string };

const KIND_LABEL: Record<FlowNode['kind'], string> = {
  trigger: 'TRIGGER',
  step: 'STEP',
  action: 'ACTION',
};

/**
 * A workflow, drawn.
 *
 * This site is about automation and until now every workflow on it was a
 * numbered list of prose. The shape of a chain — where it forks, how many hops
 * before it writes anything — is the part a list is worst at carrying.
 *
 * Static on purpose. Config text is always visible, so a tap-to-reveal
 * interaction would have had nothing to reveal; nodes take hover and focus
 * emphasis in CSS and the component ships no JavaScript. Connectors are CSS
 * pseudo-elements rather than SVG so they reflow when the row wraps to a
 * column on a phone.
 */
const Flow = ({ caption, nodes }: { caption?: string; nodes: FlowNode[] }) => (
  <Figure caption={caption} bleed>
    <ol className="pf-flow">
      {nodes.map((node) => (
        <li key={node.name} className="pf-flow-node" tabIndex={0}>
          <p style={{ ...label(9, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[2]) }}>
            {KIND_LABEL[node.kind]}
          </p>
          <p style={{ margin: 0, font: `700 15px/1.3 ${display}`, color: c.ink }}>{node.name}</p>
          {node.config && (
            <p style={{ margin: px(s[3], 0, 0), font: `500 11px/1.5 ${mono}`, color: c.dim }}>{node.config}</p>
          )}
        </li>
      ))}
    </ol>
  </Figure>
);

export default Flow;
```

- [ ] **Step 2: Style it**

```css
.pf-flow {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
@media (min-width: 720px) {
  .pf-flow {
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    grid-template-columns: none;
  }
}

.pf-flow-node {
  position: relative;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #0a0a0a;
  transition: background 0.2s ease, color 0.2s ease;
}

/* Connectors. Vertical when the chain stacks, horizontal when it runs across.
   Pseudo-elements rather than SVG: no viewBox to keep in sync with a layout
   that changes direction at a breakpoint. */
.pf-flow-node:not(:last-child)::after {
  content: '';
  position: absolute;
  background: #8a6a2a;
  left: 50%;
  top: 100%;
  width: 2px;
  height: 28px;
  transform: translateX(-50%);
}
@media (min-width: 720px) {
  .pf-flow-node:not(:last-child)::after {
    left: 100%;
    top: 50%;
    width: 28px;
    height: 2px;
    transform: translateY(-50%);
  }
}

.pf-flow-node:focus-visible {
  outline: 0;
  background: #e4ded0;
  box-shadow: 0 0 0 4px rgba(10, 10, 10, 0.12);
}
@media (hover: hover) {
  .pf-flow-node:hover {
    background: #e4ded0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pf-flow-node {
    transition: none;
  }
}
```

- [ ] **Step 3: Expose it to MDX**

Add `Flow` to the `prose` map in `prose.tsx`, alongside `Figure`.

- [ ] **Step 4: Verify with a throwaway**

Add one `<Flow>` with four nodes to `system.mdx`, check it at 1600px (a row that
bleeds into the right gutter, gold connectors between nodes) and at 375px (a
stacked column with vertical connectors), then revert the MDX change.

- [ ] **Step 5: Commit**

```bash
git add src/components/notes/Flow.tsx src/components/notes/prose.tsx src/styles/notes.css
git commit -m "$(cat <<'EOF'
feat: add the Flow diagram

Trigger to action as a bleeding row of nodes, stacking on a phone. Static, with
config always visible and CSS connectors — no JavaScript, and nothing for a
tap-to-reveal to reveal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Retrofit `/drops/automate`

The proof. Five workflows, each currently a `#### Trigger` / `#### Steps` list
followed by a JSON skeleton.

**Files:**
- Modify: `src/content/drops/automate.mdx`

**Interfaces:**
- Consumes: `<Flow>` (Task 12), `<CopyBlock>` (Task 10, already applied).
- Produces: no code. Content only.

- [ ] **Step 1: Read the file**

Run: `cat src/content/drops/automate.mdx`

For each of the five `##` workflows, the `#### Trigger` line and the `#### Steps`
list are the node chain in prose. Do not invent nodes — every node's `name` and
`config` must be a compression of text already on the page.

- [ ] **Step 2: Add one `<Flow>` per workflow**

Place it directly under each `##` heading, above `#### Trigger`. Example for
workflow 1, to be adapted to what the file actually says:

```mdx
<Flow
  caption="Comment-to-DM lead capture — five nodes, no polling."
  nodes={[
    { kind: 'trigger', name: 'Instagram webhook', config: 'Fires on a new comment.' },
    { kind: 'step', name: 'Keyword filter', config: 'Drops anything without the keyword.' },
    { kind: 'step', name: 'Dedupe', config: 'One DM per commenter per post.' },
    { kind: 'step', name: 'Build message', config: 'Slots the drop URL into the template.' },
    { kind: 'action', name: 'Send DM', config: 'Graph API. Logs the send.' },
  ]}
/>
```

Keep the prose `#### Trigger` and `#### Steps` sections. The diagram is the
shape; the prose is the detail, and deleting it would strip indexable text off
a page whose whole argument is that the artifact is on the page.

- [ ] **Step 3: Verify**

Run: `npm run dev`

`/drops/automate` at 1600px: five diagrams, each bleeding into the right gutter,
each above its own prose. The rail's TOC is unchanged — `<Flow>` introduces no
headings. The five JSON blocks still have their copy buttons.

- [ ] **Step 4: Verify nothing was lost**

Run: `npm run build`

```bash
git stash && npm run build && wc -c dist/drops/automate/index.html && git stash pop
npm run build && wc -c dist/drops/automate/index.html
```

Expected: the new file is larger. Then spot-check that every `#### Setup notes`
paragraph is still present in the built HTML.

- [ ] **Step 5: Commit**

```bash
git add src/content/drops/automate.mdx
git commit -m "$(cat <<'EOF'
content: draw the five automate workflows

One Flow per workflow, above the prose rather than instead of it — the page's
argument is that the artifact is on the page, so nothing indexable comes out to
make room for a diagram.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: The build checker and the full verification pass

Spec §9, as a script that runs rather than a list someone reads.

**Files:**
- Create: `scripts/check-notes.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: a built `dist/`.
- Produces: `npm run check` — exits non-zero with a named failure.

- [ ] **Step 1: Write the checker**

Create `scripts/check-notes.mjs`. It walks every prerendered notes page and
asserts the guarantees this project rests on. Keep it dependency-free — `node:fs`
and regex, in the style of `scripts/generate-og.mjs`.

```js
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';

/**
 * Assertions against the built HTML, not against the dev server.
 *
 * Everything this project promises is a promise about the prerendered page: the
 * rail's anchors resolve, the tables are real tables, the code blocks are whole
 * whether collapsed or not. All three are invisible in `vite dev`, where
 * hydration has already run by the time anyone looks.
 */
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

const pages = globSync('dist/{drops,wisdom,dispatch}/*/index.html');
check('found prerendered post pages', pages.length >= 12);

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  // 1. Every rail anchor resolves to an id on this page.
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  for (const anchor of anchors) {
    check(`${page}: rail anchor #${anchor} has no matching id`, ids.has(anchor));
  }

  // 2. The rail is in the static HTML, not injected on hydration.
  check(`${page}: no rail in the prerendered HTML`, html.includes('class="pf-rail"'));
}

// 3. The cheat sheet's eight tables survived the ProseTable swap.
const cheatsheet = readFileSync('dist/drops/cheatsheet/index.html', 'utf8');
check('cheatsheet has 8 tables', (cheatsheet.match(/<table/g) ?? []).length === 8);
check('cheatsheet cells carry data-label', cheatsheet.includes('data-label='));

// 4. The automate JSON survived the collapse.
const automate = readFileSync('dist/drops/automate/index.html', 'utf8');
check('automate still ships its n8n JSON', automate.includes('n8n-nodes-base'));
check('automate has five Flow diagrams', (automate.match(/class="pf-flow"/g) ?? []).length === 5);

// 5. No scroll engine reached the notes chunk.
for (const asset of globSync('dist/assets/*.js')) {
  const code = readFileSync(asset, 'utf8');
  if (!code.includes('pf-rail')) continue;
  check(`${asset}: notes chunk contains GSAP`, !code.includes('gsap'));
  check(`${asset}: notes chunk contains Lenis`, !/\blenis\b/i.test(code));
}

if (failures.length > 0) {
  console.error(`\ncheck-notes: ${failures.length} failure(s)\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`check-notes: OK — ${pages.length} pages`);
```

`globSync` from `node:fs` needs Node 22. If `node --version` is below that, swap
it for a small recursive `readdirSync` walk rather than adding a dependency.

- [ ] **Step 2: Add the script**

In `package.json`: `"check": "node scripts/check-notes.mjs"`.

- [ ] **Step 3: Run it**

Run: `npm run build && npm run check`
Expected: `check-notes: OK — 12 pages`.

Fix anything it names. A failing anchor check means Task 2's slug parity broke
against the real corpus — go back to the plugin, not to the checker.

- [ ] **Step 4: Run everything**

```bash
npm test
npm run lint
npm run build && npm run check
```

Expected: all pass. Report the notes chunk size delta against `main`:

```bash
ls -la dist/assets/ | grep -i note
```

- [ ] **Step 5: The manual pass (spec §9 items 5 and 6)**

Run `npm run preview`. At **1600 / 1280 / 1024 / 768 / 375**, on `/notes`,
`/drops/automate`, `/drops/cheatsheet`, `/drops/prompts`,
`/wisdom/ai-wrapper-tell` and `/dispatch/claudeforce`:

- The rail is a rail at 1600 and 1280, a `CONTENTS` disclosure at 1024 and below.
- No horizontal page scroll at 375 on any of the six.
- Keyboard: tab through the rail, activate a TOC link, a copy button, a sort
  button, and the download link. Every one takes visible focus.
- With `prefers-reduced-motion: reduce` set in the browser, the progress rule
  jumps rather than slides and nothing else animates.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-notes.mjs package.json
git commit -m "$(cat <<'EOF'
chore: assert the notes guarantees against the built HTML

Rail anchors resolve, the cheat sheet still ships eight real tables, automate
still ships its JSON whether collapsed or not, and no scroll engine reached the
notes chunk. All four are invisible in dev, where hydration has already run.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage.** §3.1 grid → Task 4. §3.2 rail contents → Tasks 5, 6. §3.3
index rail → Task 8. §3.4 mobile disclosure → Task 7. §4 TOC data → Tasks 2, 3.
§5.1 Figure → Task 9. §5.2 CopyBlock → Task 10. §5.3 Flow → Task 12. §5.4 →
Task 11, as the documented deviation. §6 retrofit → Task 13 (`automate` only;
`cheatsheet` needs no edit under the Task 11 approach). §7 motion and
accessibility → constraints in every task, verified in Task 14 step 5. §9
verification → Task 14. §10 out-of-scope stays out.

**Type consistency.** `Heading` is defined once in `src/data/notes.ts` (Task 3)
and imported by `Rail.tsx` (Task 5) and the plugin's test (Task 2) with the same
shape. `metaRowsOf` returns `MetaRow[]` in both its test and its use site.
`nodeText` / `parseTable` / `sortRows` keep the same signatures across
`proseTable.ts`, its test and `ProseTable.tsx`. `FlowNode['kind']` is the same
three-member union in the type, the label map and the retrofit MDX.

**Ordering.** Task 6 knowingly leaves the download button unreachable below
1200px; Task 7 closes it and both commit messages say so. No other task depends
on a later one.
