import { streamLabel, type DispatchPost, type DropPost, type Post, type WisdomPost } from '@/data/notes';

/**
 * What a post is willing to prove about itself before you click it.
 *
 * The index used to show `summary` on every row, which is written for a meta
 * description and reads like one — twelve rows of competent, interchangeable
 * prose. Every stream already carries something far more specific in its
 * frontmatter and it was all invisible until the page loaded: a drop knows what
 * artifact it hands over, a wisdom post knows what its argument costs you, a
 * dispatch knows its lead item. That is the thing worth putting on the card.
 */
export type Payload = {
  /** The small stamp: a drop's DM keyword, otherwise the stream name. */
  stamp: string;
  /** Label above the payload line. */
  tag: string;
  /** The one line that earns the click. */
  line: string;
  /** Dispatch only — "+2 MORE", where the rest of the items are. */
  more?: string;
};

export const payloadOf = (post: Post): Payload => {
  switch (post.stream) {
    case 'drop': {
      const p = post as DropPost;
      return { stamp: p.keyword, tag: 'YOU GET', line: p.artifact };
    }
    case 'wisdom': {
      const p = post as WisdomPost;
      return { stamp: streamLabel.wisdom, tag: 'THE TRADEOFF', line: p.tradeoff };
    }
    case 'dispatch': {
      const p = post as DispatchPost;
      const rest = p.items.length - 1;
      return {
        stamp: streamLabel.dispatch,
        tag: 'LEAD ITEM',
        line: p.items[0]?.headline ?? p.dateline,
        more: rest > 0 ? `+${rest} MORE` : undefined,
      };
    }
  }
};

/** How a drop arrives, as a chip. Nothing for the other two streams. */
export const formatChip = (post: Post): string | undefined => {
  if (post.stream !== 'drop') return undefined;
  const p = post as DropPost;
  return { inline: 'ON THIS PAGE', download: 'PDF', both: 'ON PAGE + PDF' }[p.format];
};
