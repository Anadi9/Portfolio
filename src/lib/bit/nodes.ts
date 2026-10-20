/**
 * Bit's node ids, without the conversation itself.
 *
 * `chat.ts` holds the conversation and imports the portfolio data (for the
 * email address), which pulls image imports that only Vite can load. The AI
 * function (`api/bit/ask.ts`) needs the ids to validate a model's route, so
 * they live here, with no imports at all. `NODES` in `chat.ts` is typed as
 * `Record<NodeId, …>`, so the two cannot drift apart without a type error.
 */

export const NODE_IDS = [
  'start', 'prod', 'prod2', 'prod3', 'prod4', 'vis', 'vis2', 'dpdp', 'dpdp2', 'free', 'teardown', 'kit',
  'ask', 'contact', 'recProd', 'recVis', 'recDpdp', 'recAi', 'recKit', 'blog', 'hunt',
  'q1', 'q2', 'q3', 'q4', 'qurl', 'notyet', 'ai', 'ai2', 'ai3', 'care', 'quote',
] as const;

export type NodeId = (typeof NODE_IDS)[number];

/**
 * Where an AI answer may hand the chat back to the buttons: the start of each
 * flow. Mid-flow nodes (`prod2`, `q3`…), recommendations built from answers
 * (`recProd`…) and the qualification endings (`qurl` says "You qualify") would
 * skip questions or claim something the visitor never earned.
 */
export const AI_ROUTES = ['start', 'prod', 'vis', 'dpdp', 'free', 'teardown', 'kit', 'contact', 'blog', 'hunt', 'ai', 'care'] as const satisfies readonly NodeId[];

export type AiRoute = (typeof AI_ROUTES)[number];

export const isNodeId = (v: unknown): v is NodeId => typeof v === 'string' && (NODE_IDS as readonly string[]).includes(v);
export const isAiRoute = (v: unknown): v is AiRoute => typeof v === 'string' && (AI_ROUTES as readonly string[]).includes(v);

/** The keys Bit records from button taps. Values are button labels, never anything typed. */
export const ANSWER_KEYS = ['stack', 'live', 'scope', 'asked', 'js', 'pd', 'consent', 'kitTool', 'users', 'impact', 'when', 'aiwant', 'aistage', 'budget'] as const;

export type AnswerKey = (typeof ANSWER_KEYS)[number];

/** AI answers per conversation. The chat counts them; the API refuses a count at or above this. */
export const MAX_AI_REPLIES = 6;

/** Longest typed question sent to the model. */
export const MAX_QUESTION = 500;
