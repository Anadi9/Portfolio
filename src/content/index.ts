import type { Frontmatter, Post, Stream } from '@/data/notes';
import { streamPath } from '@/data/notes';

type MdxModule = {
  default: Post['Body'];
  frontmatter?: Partial<Frontmatter>;
};

/**
 * Every post on the site, indexed at build time.
 *
 * `eager: true` is deliberate: the whole corpus is a handful of pages, and
 * eager modules let the index, the feed and the prerenderer share one already-
 * resolved list instead of each awaiting its own dynamic imports. It also means
 * a malformed frontmatter block fails the build rather than a page view.
 */
const modules = import.meta.glob<MdxModule>('./*/*.mdx', { eager: true });

/** `./drops/system.mdx` → `{ dir: 'drops', slug: 'system' }`. */
const parseFilePath = (file: string) => {
  const match = /^\.\/([^/]+)\/([^/]+)\.mdx$/.exec(file);
  if (!match) throw new Error(`Unexpected content path: ${file}`);
  return { dir: match[1], slug: match[2] };
};

const build = (): Post[] =>
  Object.entries(modules)
    .map(([file, mod]) => {
      const { dir, slug } = parseFilePath(file);
      const fm = mod.frontmatter;

      if (!fm?.stream) throw new Error(`${file}: frontmatter is missing \`stream\`.`);
      if (streamPath[fm.stream] !== dir) {
        throw new Error(`${file}: stream \`${fm.stream}\` belongs in src/content/${streamPath[fm.stream]}/.`);
      }
      for (const key of ['title', 'summary', 'date'] as const) {
        if (!fm[key]) throw new Error(`${file}: frontmatter is missing \`${key}\`.`);
      }

      return {
        ...(fm as Frontmatter),
        slug,
        path: `/${dir}/${slug}`,
        Body: mod.default,
      } as Post;
    })
    // Reverse-chron, and stable on ties so the feed doesn't reshuffle between
    // builds when two posts share a date.
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));

const all = build();

/**
 * Drafts are visible while running `vite dev` and dropped from the production
 * build — including from the prerendered route list, so an unfinished page is
 * never crawlable.
 */
export const posts: Post[] = import.meta.env.PROD ? all.filter((p) => !p.draft) : all;

export const postsByStream = (stream: Stream) => posts.filter((p) => p.stream === stream);

export const findPost = (stream: Stream, slug: string) =>
  posts.find((p) => p.stream === stream && p.slug === slug);

/** Every notes URL, for the SSG route list and (Phase 4) the sitemap. */
export const postPaths = () => posts.map((p) => p.path);
