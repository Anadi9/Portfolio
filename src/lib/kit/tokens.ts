import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * A buyer's access link: `/kit/downloads/<token>`, one per email.
 *
 * The token is `HMAC-SHA256(KIT_TOKEN_SECRET, salt)`. The database keeps the
 * salt and `sha256(token)`, never the token, so a copy of the database alone
 * opens nothing: the secret lives only in the server's environment. Keeping the
 * salt is what lets the thanks page show the same link the email carried, to
 * someone holding the paid session id. A new salt is a new link, which is how a
 * leaked link is revoked.
 */

export const newSalt = () => randomBytes(32).toString('base64url');

export const deriveToken = (secret: string, salt: string) => createHmac('sha256', secret).update(salt).digest('base64url');

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** 32 bytes of HMAC in base64url: 43 characters. Anything else is not worth a query. */
export const isToken = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);
