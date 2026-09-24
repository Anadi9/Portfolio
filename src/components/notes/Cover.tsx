import { coverFor, hasCover, type Post } from '@/data/notes';

/**
 * The cover band above the title.
 *
 * Every cover is a capture with the eyebrow, headline and standfirst already
 * burnt into it; they were composed as share cards, and the artwork and the
 * type were laid out together. The band shows that frame as it is: the burnt
 * words are part of the picture, and the page sets them again underneath in
 * real type.
 *
 * `alt=""` because it is decoration: everything it says, the H1 under it says
 * again in text a screen reader can actually use.
 *
 * Eager and high priority, with the intrinsic size on the tag. It is the first
 * paint above the fold on every post, and the one image on the page worth
 * spending the request on before anything else.
 *
 * Nothing at all for a post with `cover: false`: no master was ever captured
 * for it, and a band pointing at three missing files is worse than no band.
 */
const Cover = ({ post }: { post: Post }) => {
  if (!hasCover(post)) return null;
  const { src, srcSet } = coverFor(post.path);

  return (
    <div className="pf-cover pf-bleed">
      <img
        src={src}
        srcSet={srcSet}
        // The band is the content column plus the right bleed track, which tops
        // out a little over 1000px; below that it is the viewport less gutters.
        sizes="(min-width: 1200px) 1024px, 100vw"
        alt=""
        aria-hidden="true"
        width={1600}
        height={842}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
};

export default Cover;
