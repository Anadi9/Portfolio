import { formatChip } from './streamPayload';
import type { DispatchPost, DropPost, Post } from '@/data/notes';

export type MetaRow = { tag: string; value: string };

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
    .replace(/^0/, '');

/**
 * The secondary meta, for the rail.
 *
 * All of this used to sit in `PostHeader`, which meant a reader met six lines
 * of apparatus before the first sentence of the article. It is genuinely useful
 * (a drop's keyword is what the Instagram DM automation answers) but it is
 * reference, not the lede, and reference belongs in the margin.
 *
 * Wisdom gets nothing. Its tradeoff is the stream's signature block and stays
 * in the body, where the argument is.
 */
export const metaRowsOf = (post: Post): MetaRow[] => {
  const rows: MetaRow[] = [];

  if (post.stream === 'drop') {
    const drop = post as DropPost;
    rows.push({ tag: 'YOU GET', value: drop.artifact });
    const chip = formatChip(drop);
    if (chip) rows.push({ tag: 'FORMAT', value: chip });
    rows.push({ tag: 'DM KEYWORD', value: drop.keyword });
  }

  if (post.stream === 'dispatch') {
    const count = (post as DispatchPost).items.length;
    rows.push({ tag: 'IN THIS ONE', value: `${count} claim${count === 1 ? '' : 's'}` });
  }

  if (post.lastVerified) rows.push({ tag: 'LAST VERIFIED', value: fmtDate(post.lastVerified) });

  return rows;
};
