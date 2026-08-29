import type { Frontmatter, Post, Stream } from '@/data/notes';
import { PINNED, streamPath } from '@/data/notes';

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

/** The START HERE strip's posts, in `PINNED` order. Silently drops unknown paths. */
export const pinnedPosts = (): Post[] =>
  PINNED.map((path) => posts.find((p) => p.path === path)).filter((p): p is Post => Boolean(p));

/**
 * How good a follow-on read each stream makes, best first.
 *
 * A drop is evergreen and hands over an artifact, so it survives being read six
 * months late. A dispatch is dated by construction — offering one as the next
 * read is offering last week's news to someone who arrived from search, which
 * is why it ranks last even though it is often the newest thing on the site.
 */
const FOLLOW_ON_RANK: Record<Stream, number> = { drop: 0, wisdom: 1, dispatch: 2 };

/**
 * The two posts offered at the foot of `post`.
 *
 * `related` in frontmatter wins where it's set — that is the curation lever,
 * and it is worth reaching for whenever the chain is a real argument rather
 * than a plausible next click.
 *
 * Failing that, candidates are ordered by a different stream first — a drop
 * handing off to the wisdom post arguing for it is a reason to keep reading,
 * where a drop handing off to another drop is just a longer list — then by the
 * ranking above, then newest first. That order is then rotated by the source
 * post's own position in the feed.
 *
 * The rotation can and does push a post past the cross-stream head of its own
 * list, and that is the intended trade. Wisdom sits at two posts: without the
 * rotation, strict cross-stream ordering pointed all six drops at the same two
 * wisdom posts, and the other nine posts were unreachable from anywhere but the
 * index. Spreading the links matters more than the stream rule until wisdom is
 * deep enough for the rule to have somewhere to go. Curate with `related` where
 * a specific chain is worth protecting from both.
 */
export const relatedTo = (post: Post, count = 2): Post[] => {
  if (post.related?.length) {
    const picked = post.related
      .map((path) => posts.find((p) => p.path === path))
      .filter((p): p is Post => Boolean(p) && p.path !== post.path);
    if (picked.length) return picked.slice(0, count);
  }

  const rest = posts.filter((p) => p.path !== post.path);
  if (rest.length === 0) return [];

  // `posts` is already newest-first and `sort` is stable, so date survives as
  // the last tie-break without being scored here.
  const ranked = [...rest].sort((a, b) => {
    const cross = Number(a.stream === post.stream) - Number(b.stream === post.stream);
    return cross !== 0 ? cross : FOLLOW_ON_RANK[a.stream] - FOLLOW_ON_RANK[b.stream];
  });

  const offset = Math.max(0, posts.indexOf(post)) % ranked.length;
  return [...ranked.slice(offset), ...ranked.slice(0, offset)].slice(0, count);
};
