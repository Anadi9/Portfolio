import type { ComponentType } from 'react';

/**
 * The four publishing streams on /notes.
 *
 * They share one reverse-chron feed rather than three columns; Wisdom sitting
 * at zero or two posts would read as a neglected section, where the same posts
 * mixed into one feed just read as a feed. The distinction survives as a filter
 * chip and as the layout each stream gets.
 */
export type Stream = 'drop' | 'wisdom' | 'dispatch' | 'fix';

export const STREAMS: readonly Stream[] = ['drop', 'wisdom', 'dispatch', 'fix'] as const;

/** URL segment per stream. `drop` → /drops/:slug. */
export const streamPath: Record<Stream, string> = {
  drop: 'drops',
  wisdom: 'wisdom',
  dispatch: 'dispatch',
  fix: 'fixes',
};

/** Chip label on the index, and the eyebrow on each post. */
export const streamLabel: Record<Stream, string> = {
  drop: 'RESOURCE DROP',
  wisdom: 'BUILDER WISDOM',
  dispatch: 'DISPATCH',
  fix: 'FIXES',
};

/** Fields every post carries, whatever the stream. */
type BaseFrontmatter = {
  title: string;
  /** Shown in mono under the title. The one-line "reach for this when…". */
  useWhen: string;
  /** Meta description and feed standfirst. Kept separate from `useWhen`. */
  summary: string;
  /**
   * The `<title>` when `title` is too long for a results page. Google cuts
   * around 60 characters, and the H1s here run past 100, so the words people
   * actually search for were the ones being truncated. Search phrasing first;
   * the page itself keeps `title`.
   */
  seoTitle?: string;
  /**
   * The meta description when `summary` is too long to survive as a snippet
   * (roughly 155 characters). The standfirst on the page stays `summary`.
   */
  description?: string;
  /** ISO date, `YYYY-MM-DD`. Sorts the feed. */
  date: string;
  /** Set once content is verified against reality; see the cheatsheet risk. */
  lastVerified?: string;
  /** Excluded from the index and from prerender in a production build. */
  draft?: boolean;
  /**
   * Overrides the automatic reading estimate. `0` hides it entirely.
   *
   * Set it where the body is mostly component-rendered and the word count would
   * lie: `/drops/prompts` is 3KB of markdown around a hundred-record library,
   * and it is a reference you search rather than a page you read end to end, so
   * it carries `0`.
   */
  readingMinutes?: number;
  /** The reel this came from, for two-way traffic (Phase 4). */
  sourcePost?: string;
  /**
   * Hand-picked follow-on reads, as paths (`/wisdom/ai-wrapper-tell`).
   *
   * Optional: `relatedTo` in `src/content/index.ts` falls back to picking two
   * automatically. Set it where the chain is a real argument (a drop that only
   * makes sense once you've read the wisdom post behind it) and leave it off
   * where any recent post would do.
   */
  related?: string[];
  /**
   * `false` for a post with no cover master in `assets/covers/`. The page then
   * opens on its eyebrow instead of a hero band, the feed card shows the pixel
   * plate in the thumbnail slot, and the share card falls back to the site's
   * own `/og.png`. See `hasCover`.
   */
  cover?: boolean;
};

/**
 * Per-stream frontmatter extensions.
 *
 * A drop is an artifact plus instructions; wisdom is an argument with a cost
 * attached; a dispatch is dated items. Each stream's extra fields are what its
 * layout renders, so the discriminant is doing real work, not labelling.
 */
export type DropFrontmatter = BaseFrontmatter & {
  stream: 'drop';
  /** What the reader leaves with: "n8n workflow JSON", "9-section template". */
  artifact: string;
  /** How it arrives: 'inline' | 'download' | 'both'. */
  format: 'inline' | 'download' | 'both';
  /** The DM keyword this slug answers. `AUTOMATE` → /drops/automate. */
  keyword: string;
  /** Set only when `format` includes a download. */
  downloadHref?: string;
};

export type WisdomFrontmatter = BaseFrontmatter & {
  stream: 'wisdom';
  /** The two or three concrete things to do. Rendered as the numbered spine. */
  moves: string[];
  /** What this costs you. Renders on `c.plate`, the stream's signature block. */
  tradeoff: string;
};

export type DispatchFrontmatter = BaseFrontmatter & {
  stream: 'dispatch';
  /** "28 AUG 2026 · Bengaluru". Sits where `useWhen` does on the other two. */
  dateline: string;
  /** Headline plus why it matters, per item. */
  items: { headline: string; why: string }[];
};

/**
 * A fix: one failure mode of an AI-built app, why it happens, and the repair.
 *
 * The only stream that sells something, and it says so once, at the end: the
 * layout closes every fix on a CTA to the free audit, deep-linked to the
 * symptom the post is about, so a reader who recognised their app in it lands
 * on a form with that box already ticked.
 */
export type FixFrontmatter = BaseFrontmatter & {
  stream: 'fix';
  /** The repair in one line. The feed card's payload and the rail's first row. */
  fix: string;
  /**
   * The `area` of the matching row in `SYMPTOMS` (src/lib/rescue/intake.ts):
   * `Database`, `Deployment`, `Visibility`. Named rather than indexed, because
   * the index is what the audit URL carries and rows get inserted above the
   * catch-all; `auditHref` resolves it at render time. Left off, or naming an
   * area that no longer exists, the CTA links to the audit with nothing ticked.
   */
  symptom?: string;
  /** Adds a second CTA to the free Supabase check at `/scan`. */
  scan?: boolean;
};

export type Frontmatter = DropFrontmatter | WisdomFrontmatter | DispatchFrontmatter | FixFrontmatter;

/**
 * One entry in a post's rail TOC.
 *
 * Not frontmatter; nobody writes this by hand. `remark-headings` extracts it
 * from the body at build time, and `id` is guaranteed to match the id
 * `rehype-slug` put on the heading itself.
 */
export type Heading = { depth: 2 | 3; id: string; text: string };

/** A post: its frontmatter, its slug, its spine, and the compiled MDX body. */
export type Post<F extends Frontmatter = Frontmatter> = F & {
  slug: string;
  path: string;
  /** The h2/h3 spine, in document order. Empty for a post with no headings. */
  headings: Heading[];
  /** Prose word count, code blocks excluded. Drives the reading estimate. */
  words: number;
  Body: ComponentType<Record<string, unknown>>;
};

export type DropPost = Post<DropFrontmatter>;
export type WisdomPost = Post<WisdomFrontmatter>;
export type DispatchPost = Post<DispatchFrontmatter>;
export type FixPost = Post<FixFrontmatter>;

/** Whether the post has a cover band and OG card on disk. */
export const hasCover = (post: Pick<Post, 'cover'>) => post.cover !== false;

/**
 * The per-post cover, in the three widths `scripts/generate-covers.mjs` writes.
 *
 * The path mirrors the post's own URL, so neither side carries a mapping:
 * `/drops/system` → `/covers/drops/system-800.webp`. Unlike the OG cards these
 * live in `public/`, which means they are real files under `vite dev` too: the
 * hero is the first thing on the page and debugging it against a 404 is not a
 * thing anyone should have to do.
 *
 * 800 is the `src` rather than 1600, because it is what a phone at 2x picks, which is
 * most of the traffic, and it is the width a browser too old for `srcset`
 * should get stuck with.
 */
export const COVER_WIDTHS = [480, 800, 1600] as const;

export const coverFor = (path: string) => ({
  src: `/covers${path}-800.webp`,
  srcSet: COVER_WIDTHS.map((w) => `/covers${path}-${w}.webp ${w}w`).join(', '),
});

/**
 * The per-post OG card: the same artwork as the cover, cropped to 1200 x 630
 * with the title still burnt into it, written to `public/og/<stream>/<slug>.jpg`
 * by `scripts/generate-covers.mjs`.
 *
 * JPEG, not PNG: these are photographs now rather than the flat six-colour card
 * satori used to compose, and a PNG of one is ten times the size for no visible
 * gain.
 */
export const ogImageFor = (path: string) => `/og${path}.jpg`;

/**
 * The three posts the START HERE strip pins above the feed.
 *
 * Twelve equally-weighted rows is a choice-paralysis problem for someone who
 * arrived from a reel with no idea which one they want. These are ordered as an
 * on-ramp (decide, then prompt, then automate) not by date or by traffic.
 * Paths, not slugs, so a pin can cross streams later without changing shape.
 */
export const PINNED: readonly string[] = ['/drops/system', '/drops/prompts', '/drops/swipe'];

/** Inverse of `streamPath`, for resolving a URL back to its stream. */
export const pathToStream: Record<string, Stream> = {
  drops: 'drop',
  wisdom: 'wisdom',
  dispatch: 'dispatch',
  fixes: 'fix',
};

/**
 * Minutes to read, or `null` where the estimate would be a lie.
 *
 * 230 words a minute is the middle of the range research puts silent reading
 * at for this kind of material. The number is deliberately coarse: it exists
 * to answer "is this a coffee or a commute", and a false precision like
 * "7.4 minutes" answers a question nobody asked.
 */
export const readingMinutes = (post: Post): number | null => {
  if (post.readingMinutes !== undefined) return post.readingMinutes || null;
  return Math.max(1, Math.round(post.words / 230));
};
