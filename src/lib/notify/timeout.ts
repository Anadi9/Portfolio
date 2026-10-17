/**
 * Bounds best-effort work. Resolves with the promise's value, or `undefined`
 * after `ms` (logging `[tickets] timeout`). Never rejects: a rejection is
 * logged and swallowed too. The underlying work is not cancelled.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn('[tickets] timeout', label, ms);
      resolve(undefined);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        console.error('[tickets] failed', label, err);
        resolve(undefined);
      },
    );
  });
}
