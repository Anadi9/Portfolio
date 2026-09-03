import { QUESTIONS, MAX_RAW } from './questions.js';
import { isValidAnswers, score } from './score.js';
import { reachableScores } from './share-card-art.mjs';

/**
 * The share link's wire format.
 *
 * A result is shareable, and the whole result is thirteen two-bit answers, so
 * the link carries the answers rather than a scored report — the same bargain
 * `api/teardown-report.ts` makes with its payload, and for the same reason:
 * a recipient's browser re-runs `score` and `report` over them, so there is
 * still exactly one implementation of the scoring in the system.
 *
 * The score is NOT in here. It lives in the path segment (`resultPath`),
 * because that is the part a crawler reads: `/teardown/r/:score` prerenders to
 * a real page with its own title and OG card, and the query is for the browser
 * alone. A crawler that never parses `?a=` still gets an accurate card.
 *
 * Nothing here is a secret. The code is an encoding, not a token: anyone can
 * decode it, and there is nothing behind it worth protecting — the report is
 * computed in the browser from data already in the bundle. See `Gate`.
 */

/**
 * Crockford's base 32: no `I`, `L`, `O` or `U`.
 *
 * A code gets read aloud, retyped off a slide and mangled by clients that
 * lowercase a URL. Dropping the four characters that collide with `1`, `0` and
 * each other removes the ambiguity rather than trying to correct for it.
 */
export const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

const BITS_PER_ANSWER = 2;
const BITS_PER_CHAR = 5;

/** 13 answers × 2 bits. */
const PAYLOAD_BITS = QUESTIONS.length * BITS_PER_ANSWER;

/** 6 characters: the smallest base-32 code that holds 26 bits. */
export const CODE_LENGTH = Math.ceil(PAYLOAD_BITS / BITS_PER_CHAR);

/**
 * The high bits a valid code can never use: 6 × 5 = 30 bits of room for a
 * 26-bit payload. Asserting they are zero on the way in rejects roughly fifteen
 * of every sixteen random strings, which is most of what a truncated or
 * hand-mangled link arrives as.
 */
const PADDING_BITS = CODE_LENGTH * BITS_PER_CHAR - PAYLOAD_BITS;

export function encodeAnswers(answers: number[]): string {
  if (!isValidAnswers(answers)) {
    throw new Error('share: refusing to encode answers the scorer would reject.');
  }

  // 26 bits, first answer most significant. Well inside the 53 bits a JS number
  // holds exactly, so plain arithmetic is safe and `BigInt` is not needed.
  let value = 0;
  for (const answer of answers) value = value * 4 + answer;

  let code = '';
  for (let i = CODE_LENGTH - 1; i >= 0; i--) {
    code += ALPHABET[Math.floor(value / 32 ** i) % 32];
  }
  return code;
}

/**
 * The inverse, total and strict: anything that is not a code this module
 * produced comes back as `null` rather than as a plausible-looking result.
 * The result page renders a score-only view when it gets one.
 */
export function decodeAnswers(code: string | null | undefined): number[] | null {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) return null;

  let value = 0;
  for (const ch of code.toLowerCase()) {
    const digit = ALPHABET.indexOf(ch);
    if (digit < 0) return null;
    value = value * 32 + digit;
  }

  // The padding bits sit above the payload, so anything at or beyond 2^26 was
  // never produced here.
  if (PADDING_BITS > 0 && value >= 2 ** PAYLOAD_BITS) return null;

  const answers: number[] = [];
  for (let i = QUESTIONS.length - 1; i >= 0; i--) {
    answers[i] = value % 4;
    value = Math.floor(value / 4);
  }

  // Belt and braces: the bit width guarantees every answer is 0–3, but
  // `isValidAnswers` is the definition of a well-formed answer set and this
  // module should not be a second opinion on it.
  return isValidAnswers(answers) ? answers : null;
}

/** The shareable path for a completed run. */
export const resultPath = (answers: number[]): string =>
  `${resultBase(score(answers).score)}?a=${encodeAnswers(answers)}`;

const resultBase = (score: number) => `/teardown/r/${score}`;

/**
 * Every result path the build has to prerender, which is one per score rather
 * than one per run: 4^13 runs collapse onto 40 scores, and the score is the
 * only part of a result a crawler ever reads.
 *
 * `routes.tsx` hands this straight to `getStaticPaths`. A score missing from
 * here is a shared link that 404s, so `share.test.ts` checks the list against
 * what `resultPath` actually produces rather than against itself.
 */
export const resultPaths = (): string[] => reachableScores(MAX_RAW).map(resultBase);
