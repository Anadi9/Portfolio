import { describe, expect, it } from 'vitest';
import { MAX_RAW, QUESTIONS } from './questions';
import { isValidAnswers, score } from './score';
import { reachableScores } from './share-card-art.mjs';
import {
  ALPHABET,
  CODE_LENGTH,
  decodeAnswers,
  encodeAnswers,
  resultPath,
  resultPaths,
} from './share';

/** 13 answers, all at the given option index. */
const all = (i: number) => QUESTIONS.map(() => i);

/**
 * A deterministic answer-set generator. Sampling beats exhaustion here: 4^13 is
 * 67 million round trips, and a fixed sequence catches the same bugs in 500.
 */
function* sample(n: number) {
  let seed = 0x5eed;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  // High bits, not low: an LCG's bottom two bits cycle with period 4, so `% 4`
  // here yields the same dozen answer sets however many are asked for.
  for (let i = 0; i < n; i++) yield QUESTIONS.map(() => (next() >> 16) % 4);
}

describe('encodeAnswers', () => {
  it('is six characters from the alphabet, whatever the answers', () => {
    for (const answers of sample(200)) {
      const code = encodeAnswers(answers);
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code, code).toMatch(new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`));
    }
  });

  it('encodes an all-first-option run as the zero code', () => {
    expect(encodeAnswers(all(0))).toBe('000000');
  });

  it('gives different answer sets different codes', () => {
    const codes = new Set<string>();
    let count = 0;
    for (const answers of sample(500)) {
      codes.add(encodeAnswers(answers));
      count += 1;
    }
    expect(codes.size).toBe(count);
  });

  it('refuses answers the scorer would refuse', () => {
    expect(() => encodeAnswers([0, 1, 2])).toThrow();
    expect(() => encodeAnswers(all(4))).toThrow();
    expect(() => encodeAnswers(all(-1))).toThrow();
  });
});

describe('decodeAnswers', () => {
  it('round-trips every answer set it is given', () => {
    for (const answers of [all(0), all(1), all(2), all(3), ...sample(500)]) {
      expect(decodeAnswers(encodeAnswers(answers))).toEqual(answers);
    }
  });

  it('returns answers the scorer accepts', () => {
    for (const answers of sample(50)) {
      const decoded = decodeAnswers(encodeAnswers(answers));
      expect(isValidAnswers(decoded)).toBe(true);
    }
  });

  it('rejects a code of the wrong length', () => {
    expect(decodeAnswers('')).toBeNull();
    expect(decodeAnswers('00000')).toBeNull();
    expect(decodeAnswers('0000000')).toBeNull();
  });

  it('rejects characters outside the alphabet', () => {
    // `i`, `l`, `o` and `u` are deliberately absent, so a misread `1` or `0`
    // fails rather than silently decoding to a different result.
    expect(decodeAnswers('00000i')).toBeNull();
    expect(decodeAnswers('00000o')).toBeNull();
    expect(decodeAnswers('0000 0')).toBeNull();
    expect(decodeAnswers('00-000')).toBeNull();
  });

  it('rejects a code whose padding bits are not zero', () => {
    // 13 answers is 26 bits inside a 30-bit code, so the top four bits are
    // always zero on anything this encoder produced. Checking them throws out
    // most of the random strings a mangled link can arrive as.
    const highest = ALPHABET[ALPHABET.length - 1];
    expect(decodeAnswers(`${highest}00000`)).toBeNull();
  });

  it('rejects nothing at all', () => {
    expect(decodeAnswers(null)).toBeNull();
    expect(decodeAnswers(undefined)).toBeNull();
  });

  it('is case-insensitive, because a link travels through case-mangling clients', () => {
    for (const answers of sample(50)) {
      const code = encodeAnswers(answers);
      expect(decodeAnswers(code.toUpperCase())).toEqual(answers);
    }
  });
});

describe('resultPath', () => {
  it('puts the score in the path and the answers in the query', () => {
    const answers = all(0);
    expect(resultPath(answers)).toBe(`/teardown/r/100?a=${encodeAnswers(answers)}`);
  });

  it('agrees with the scorer on every sampled run', () => {
    for (const answers of sample(100)) {
      const path = resultPath(answers);
      expect(path).toBe(`/teardown/r/${score(answers).score}?a=${encodeAnswers(answers)}`);
    }
  });
});

describe('resultPaths', () => {
  it('is one prerenderable path per reachable score', () => {
    const paths = resultPaths();
    expect(paths).toHaveLength(reachableScores(MAX_RAW).length);
    expect(paths[0]).toBe('/teardown/r/0');
    expect(paths[paths.length - 1]).toBe('/teardown/r/100');
  });

  it('covers the path every share link points at', () => {
    const paths = new Set(resultPaths());
    for (const answers of [all(0), all(1), all(2), all(3), ...sample(300)]) {
      // The query is the browser's business; the path is what has to exist as a
      // prerendered page, or a shared link 404s.
      expect(paths, `answers scoring ${score(answers).score}`).toContain(
        resultPath(answers).split('?')[0],
      );
    }
  });
});
