/**
 * The command centre's cards (`/admin`). Bit posts client news, Coach posts
 * deadlines and plan items. Email and WhatsApp alerts are copies of a card.
 * Table: supabase/migrations/20261019000000_feed_items.sql.
 */

export const FEED_BOTS = ['bit', 'coach'] as const;
export const FEED_ACTIONS = ['open', 'approve_send', 'mark_done'] as const;

export type FeedBot = (typeof FEED_BOTS)[number];
/** The card's main button. Edit (on drafts), Snooze and Mark done are on every card. */
export type FeedAction = (typeof FEED_ACTIONS)[number];

export type NewFeedItem = {
  ticketId?: string | null;
  bot: FeedBot;
  kind: string;
  title: string;
  body?: string;
  action: FeedAction;
  /** What the card is about, e.g. the draft's `messages.id`. */
  ref?: string | null;
  urgent?: boolean;
};

export type FeedItem = {
  id: string;
  ticketId: string | null;
  bot: FeedBot;
  kind: string;
  title: string;
  body: string;
  action: FeedAction;
  ref: string | null;
  urgent: boolean;
  createdAt: string;
  doneAt: string | null;
  snoozedUntil: string | null;
  /** "Give to helper": a label until there is a helper. */
  assignee: 'helper' | null;
};

export const FEED_TITLE_MAX = 140;
export const FEED_BODY_MAX = 2000;

/** Newest first, urgent before everything. Shared so both stores sort alike. */
export const feedOrder = (a: FeedItem, b: FeedItem) => Number(b.urgent) - Number(a.urgent) || b.createdAt.localeCompare(a.createdAt);

export const isOpen = (f: FeedItem, now: Date) => !f.doneAt && (!f.snoozedUntil || Date.parse(f.snoozedUntil) <= now.getTime());
