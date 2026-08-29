/**
 * Reading the corpus from plain Node.
 *
 * Shared by `generate-og.mjs` and `generate-feeds.mjs`, which both run after
 * the Vite build and both need the same list of published posts.
 *
 * The frontmatter is parsed here rather than imported from
 * `src/content/index.ts` because that module is a Vite module —
 * `import.meta.glob` does not exist in plain Node. Only flat scalar keys are
 * read (`title`, `summary`, `stream`, `date`, `lastVerified`, `draft`), which
 * is all either consumer needs and all the streams agree on.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT = join(root, 'src', 'content');

/** Canonical origin. Kept in step with `ORIGIN` in src/components/Seo.tsx. */
export const ORIGIN = 'https://anadithakur.in';

// Kept in step with src/data/notes.ts. A stream added there without a line here
// throws below rather than silently shipping a post with no card and no feed
// entry.
export const streamPath = { drop: 'drops', wisdom: 'wisdom', dispatch: 'dispatch' };

/** The `---` block at the top of an MDX file, as flat scalars. */
export const frontmatter = (src, file) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) throw new Error(`${file}: no frontmatter block.`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) continue; // list items and continuation lines — not needed here
    let v = kv[2].trim();
    if (/^"(.*)"$/.test(v) || /^'(.*)'$/.test(v)) v = v.slice(1, -1);
    fm[kv[1]] = v === 'true' ? true : v === 'false' ? false : v;
  }
  return fm;
};

export const collect = () => {
  const posts = [];
  for (const dir of readdirSync(CONTENT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of readdirSync(join(CONTENT, dir.name))) {
      if (!name.endsWith('.mdx')) continue;
      const file = join(CONTENT, dir.name, name);
      const fm = frontmatter(readFileSync(file, 'utf8'), file);
      if (fm.draft === true) continue;
      if (!streamPath[fm.stream]) throw new Error(`${file}: unknown stream \`${fm.stream}\`.`);
      posts.push({ ...fm, slug: name.replace(/\.mdx$/, ''), dir: dir.name });
    }
  }
  return posts;
};

/** The post's URL path, and the key the generated banners are indexed by. */
export const pathOf = (post) => `/${post.dir}/${post.slug}`;

/**
 * `DROP 01` counts up in publication order, so the numeral on a card never
 * changes once it ships. Same (date, slug) comparator the feed uses, reversed —
 * the feed shows newest first, the numbering runs oldest first.
 */
