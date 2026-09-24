import DropLayout from '@/components/notes/DropLayout';
import WisdomLayout from '@/components/notes/WisdomLayout';
import DispatchLayout from '@/components/notes/DispatchLayout';
import FixLayout from '@/components/notes/FixLayout';
import type { DispatchPost, DropPost, FixPost, Post, WisdomPost } from '@/data/notes';

/**
 * Picks the layout off the frontmatter's stream discriminant.
 *
 * One route element per post is generated in `routes.tsx`, so this never has to
 * handle a missing post: an unknown URL falls through to the 404 route instead
 * of rendering an empty article shell.
 */
const NotePost = ({ post }: { post: Post }) => {
  switch (post.stream) {
    case 'drop':
      return <DropLayout post={post as DropPost} />;
    case 'wisdom':
      return <WisdomLayout post={post as WisdomPost} />;
    case 'dispatch':
      return <DispatchLayout post={post as DispatchPost} />;
    case 'fix':
      return <FixLayout post={post as FixPost} />;
  }
};

export default NotePost;
