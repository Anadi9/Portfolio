// MDX → plain markdown for `llms-full.txt`: the whole corpus in one file an
// answer engine can read without parsing the site's HTML. Code fences are kept
// verbatim; outside them, frontmatter, top-level import/export lines and
// interactive components (`<Flow … />`) are dropped, and wrapper components
// (`<Callout>…</Callout>`) keep their inner text. Root-relative links become
// absolute.

const ORIGIN = 'https://anadithakur.in';

export function mdxToText(source) {
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
  const out = [];
  let fence = false;
  let skipping = null; // name of a self-closing component being skipped
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    if (skipping) {
      if (/\/>\s*$/.test(line) || new RegExp(`</${skipping}>`).test(line)) skipping = null;
      continue;
    }
    if (/^(import|export)\s/.test(line)) continue;
    const open = /^\s*<([A-Z][\w.]*)\b/.exec(line);
    if (open) {
      const name = open[1];
      if (/\/>\s*$/.test(line)) continue; // one-line self-closing
      if (/>\s*$/.test(line) && !/=\s*\{/.test(line)) continue; // `<Callout>` opener: keep what's inside
      skipping = name; // multi-line props: drop until the tag closes
      continue;
    }
    if (/^\s*<\/[A-Z][\w.]*>\s*$/.test(line)) continue; // wrapper close
    out.push(line.replace(/\]\(\/(?!\/)/g, `](${ORIGIN}/`));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
