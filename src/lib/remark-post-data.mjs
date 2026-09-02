import GithubSlugger from 'github-slugger';
import { valueToEstree } from 'estree-util-value-to-estree';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

/**
 * Exports what the layouts need to know about a post's body but cannot see:
 * its h2/h3 spine as `headings`, and its prose word count as `words`.
 *
 * The rail has to be in the prerendered HTML. Reading heading ids out of the
 * DOM after mount would mean the whole table of contents pops in on hydration
 * and never exists for a crawler, the same argument `DropLayout` already makes
 * about a page whose content is a file.
 *
 * The ids MUST match the ones `rehype-slug` writes onto the headings
 * themselves, or every link in the rail is dead and nothing complains. Parity
 * is bought by using the same library the same way: one `GithubSlugger` per
 * file, fed in document order, so the `-1` / `-2` suffixes on repeated headings
 * land identically. `automate.mdx` repeats `Trigger` five times, so this is
 * load-bearing rather than defensive.
 *
 * `words` counts prose only; code blocks are excluded, because nobody reads a
 * forty-line n8n workflow linearly and counting it would tell a reader that
 * `/drops/automate` takes twenty minutes when the prose takes six.
 *
 * Registered LAST in `remarkPlugins` so the frontmatter plugins have already
 * consumed their node before this appends to `tree.children`.
 */
export default function remarkPostData() {
  return (tree) => {
    const slugger = new GithubSlugger();
    const headings = [];
    let words = 0;

    visit(tree, (node) => {
      if (node.type === 'code') return 'skip';
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        const text = toString(node);
        headings.push({ depth: node.depth, id: slugger.slug(text), text });
      }
      if (node.type === 'text') {
        words += node.value.split(/\s+/).filter(Boolean).length;
      }
      return undefined;
    });

    // Appended, not unshifted: `export const` order is irrelevant to the
    // importer, and staying off the front of the tree keeps this clear of
    // whatever the frontmatter plugins expect to find there.
    //
    // Two statements rather than one with two declarators, so the compiled
    // output reads `export const headings = [...];` and `export const words =
    // N;` on their own, which is what anything grepping the module (a test,
    // a person) expects to find.
    for (const [name, value] of [
      ['headings', headings],
      ['words', words],
    ]) {
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
                      id: { type: 'Identifier', name },
                      init: valueToEstree(value),
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    }
  };
}
