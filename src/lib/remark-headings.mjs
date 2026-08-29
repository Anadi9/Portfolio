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
