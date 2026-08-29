import banners from '@/generated/banners.json';
import type { Post } from '@/data/notes';

/**
 * The plate above the title.
 *
 * A neon pixel field cannot be the page's background without fighting the
 * paper, so it is framed as an object sitting *in* the page — a screen embedded
 * in a document. The cream edge is what does that framing, and it is the same
 * cream edge the OG card has always used.
 *
 * The image is a data URI baked in at build time, not a file: it is above the
 * fold, and a banner that arrives late is a visible pop. `alt=""` because it is
 * decoration — the word on the plate repeats what the eyebrow and the H1
 * already say, and announcing "AUTOMATE" before the title is noise.
 *
 * Renders nothing for a post with no plate rather than a broken image. A
 * genuinely missing banner is caught by `scripts/check-notes.mjs`, which is the
 * right place for it: a silent gap in dev is survivable, a shipped gap is not.
 */
const Banner = ({ post }: { post: Post }) => {
  const src = (banners as Record<string, string>)[post.path];
  if (!src) return null;

  return (
    <div className="pf-banner pf-bleed">
      <img src={src} alt="" aria-hidden="true" width={360} height={60} />
    </div>
  );
};

export default Banner;
