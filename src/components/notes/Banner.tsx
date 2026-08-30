import banners from '@/generated/banners.json';
import type { Post } from '@/data/notes';

/**
 * The plate that closes the article.
 *
 * A neon pixel field cannot be the page's background without fighting the
 * paper, so it is framed as an object sitting *in* the page — a screen embedded
 * in a document. The cream edge is what does that framing.
 *
 * It sat above the title until the covers arrived. Two bands over one headline
 * was one too many, and of the two the cover is the one carrying artwork made
 * for the post, so the plate moved to the end and became a sign-off — the last
 * thing under the last paragraph, before READ NEXT.
 *
 * The image is still a data URI baked in at build time rather than a file.
 * Below the fold it no longer has to be, but it is a couple of KB and the
 * request it saves is one the page would otherwise make after everything else
 * has settled, which is exactly when a late band is most visible.
 *
 * `alt=""` because it is decoration — the word on the plate repeats what the
 * eyebrow and the H1 already said.
 *
 * Renders nothing for a post with no plate rather than a broken image. A
 * genuinely missing banner is caught by `scripts/check-notes.mjs`, which is the
 * right place for it: a silent gap in dev is survivable, a shipped gap is not.
 */
const Banner = ({ post }: { post: Post }) => {
  const entry = (banners as Record<string, { page: string }>)[post.path];
  if (!entry) return null;

  return (
    <div className="pf-banner pf-bleed">
      <img src={entry.page} alt="" aria-hidden="true" width={360} height={60} />
    </div>
  );
};

export default Banner;
