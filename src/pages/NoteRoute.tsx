import { useLocation } from 'react-router-dom';
import NotePost from './NotePost';
import NotFound from './NotFound';
import { findPost } from '@/content';
import { pathToStream } from '@/data/notes';

/**
 * The single element behind all three post routes.
 *
 * Stream comes from the first path segment rather than a prop, so `/drops/x`,
 * `/wisdom/x` and `/dispatch/x` can all point at this one lazily-loaded module
 * which is what keeps the entire content corpus and its three layouts out of
 * the chunk the front page has to download.
 */
export const Component = () => {
  const [, dir, slug] = useLocation().pathname.split('/');
  const stream = pathToStream[dir];
  const post = stream && slug ? findPost(stream, slug) : undefined;

  // A slug that never existed, or a draft in a production build.
  if (!post) return <NotFound />;

  return <NotePost post={post} />;
};

export default Component;
