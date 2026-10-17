/**
 * The fixed "How was it built?" answers. Server-safe (no imports): the chat
 * builds its buttons from this list, `/api/bit/ticket` accepts only these, and
 * the public board shows only these (plus the audit form's `TOOLS`).
 */
export const BUILD_STACKS = ['Hand-coded (React / Node)', 'Cursor or Claude Code', 'Lovable, Bolt or v0', 'Replit'] as const;

/** The audit form's tool choices; tickets from that form set `stack` from this list. */
export const TOOLS = ['Hand-coded', 'Lovable', 'Bolt', 'Cursor', 'v0', 'Replit', 'Something else'] as const;

/** Every `stack` value that may appear on the public board. */
export const BOARD_STACKS: readonly string[] = [...BUILD_STACKS, ...TOOLS];
