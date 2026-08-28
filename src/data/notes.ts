import type { ComponentType } from 'react';

/**
 * The three publishing streams on /notes.
 *
 * They share one reverse-chron feed rather than three columns — Wisdom sitting
 * at zero or two posts would read as a neglected section, where the same posts
 * mixed into one feed just read as a feed. The distinction survives as a filter
 * chip and as the layout each stream gets.
 */
export type Stream = 'drop' | 'wisdom' | 'dispatch';

export const STREAMS: readonly Stream[] = ['drop', 'wisdom', 'dispatch'] as const;

/** URL segment per stream. `drop` → /drops/:slug. */
export const streamPath: Record<Stream, string> = {
  drop: 'drops',
  wisdom: 'wisdom',
  dispatch: 'dispatch',
};

/** Chip label on the index, and the eyebrow on each post. */
export const streamLabel: Record<Stream, string> = {
  drop: 'RESOURCE DROP',
  wisdom: 'BUILDER WISDOM',
  dispatch: 'DISPATCH',
};

/** Fields every post carries, whatever the stream. */
type BaseFrontmatter = {
  title: string;
  /** Shown in mono under the title. The one-line "reach for this when…". */
  useWhen: string;
  /** Meta description and feed standfirst. Kept separate from `useWhen`. */
  summary: string;
  /** ISO date, `YYYY-MM-DD`. Sorts the feed. */
  date: string;
  /** Set once content is verified against reality — see the cheatsheet risk. */
  lastVerified?: string;
  /** Excluded from the index and from prerender in a production build. */
  draft?: boolean;
  /** The reel this came from, for two-way traffic (Phase 4). */
  sourcePost?: string;
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
  /** What the reader leaves with — "n8n workflow JSON", "9-section template". */
  artifact: string;
  /** How it arrives — 'inline' | 'download' | 'both'. */
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
  /** What this costs you. Renders on `c.plate` — the stream's signature block. */
  tradeoff: string;
};

export type DispatchFrontmatter = BaseFrontmatter & {
  stream: 'dispatch';
  /** "28 AUG 2026 — Bengaluru". Sits where `useWhen` does on the other two. */
  dateline: string;
  /** Headline plus why it matters, per item. */
  items: { headline: string; why: string }[];
};

export type Frontmatter = DropFrontmatter | WisdomFrontmatter | DispatchFrontmatter;

/** A post: its frontmatter, its slug, and the compiled MDX body. */
export type Post<F extends Frontmatter = Frontmatter> = F & {
  slug: string;
  path: string;
  Body: ComponentType<Record<string, unknown>>;
};

export type DropPost = Post<DropFrontmatter>;
export type WisdomPost = Post<WisdomFrontmatter>;
export type DispatchPost = Post<DispatchFrontmatter>;

/**
 * The per-post OG card, rendered at build time by `scripts/generate-og.mjs`
 * into `dist/og/<stream>/<slug>.png`. The path mirrors the post's own URL, so
 * neither side has to carry a mapping — `/drops/system` → `/og/drops/system.png`.
 *
 * The cards only exist in a built `dist/`, so this 404s under `vite dev`. That
 * is deliberate: they're build artefacts, not source, and nothing but a crawler
 * ever asks for one.
 */
export const ogImageFor = (path: string) => `/og${path}.png`;

/** Inverse of `streamPath`, for resolving a URL back to its stream. */
export const pathToStream: Record<string, Stream> = {
  drops: 'drop',
  wisdom: 'wisdom',
  dispatch: 'dispatch',
};
