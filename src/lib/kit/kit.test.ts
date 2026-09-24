import { createHmac } from 'node:crypto';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildKitArchive } from './archive';
import { renderKitEmail } from './email';
import { downloadUrl, kitPrice } from './product';
import { isPaidKitSession, isSessionId, verifyStripeSignature } from './stripe';

const SECRET = 'whsec_test';
const sign = (body: string, t: number, secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

describe('verifyStripeSignature', () => {
  const body = '{"type":"checkout.session.completed"}';
  const now = 1_800_000_000;

  it('accepts a correct signature inside the tolerance', () => {
    expect(verifyStripeSignature(body, sign(body, now - 60), SECRET, now)).toBe(true);
  });

  it('accepts when any one of several v1 signatures matches (secret rotation)', () => {
    const header = `t=${now},v1=${'0'.repeat(64)},${sign(body, now).split(',')[1]}`;
    expect(verifyStripeSignature(body, header, SECRET, now)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, a stale timestamp and a missing header', () => {
    expect(verifyStripeSignature(body + ' ', sign(body, now), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now, 'whsec_other'), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, now - 301), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, undefined, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, 't=abc,v1=zz', SECRET, now)).toBe(false);
  });
});

describe('session checks', () => {
  it('unlocks only a paid session stamped as the kit', () => {
    expect(isPaidKitSession({ payment_status: 'paid', metadata: { product: 'production-kit' } })).toBe(true);
    expect(isPaidKitSession({ payment_status: 'unpaid', metadata: { product: 'production-kit' } })).toBe(false);
    expect(isPaidKitSession({ payment_status: 'paid', metadata: { product: 'something-else' } })).toBe(false);
    expect(isPaidKitSession({ payment_status: 'paid', metadata: null })).toBe(false);
  });

  it('recognises checkout session ids and nothing else', () => {
    expect(isSessionId('cs_test_a1B2c3D4e5F6g7H8')).toBe(true);
    expect(isSessionId('cs_live_a1B2c3D4e5F6g7H8')).toBe(true);
    expect(isSessionId('pi_123')).toBe(false);
    expect(isSessionId('cs_test_../../etc')).toBe(false);
    expect(isSessionId(undefined)).toBe(false);
  });
});

describe('buildKitArchive', () => {
  const zip = unzipSync(buildKitArchive(join(import.meta.dirname, '../../../products/production-kit')));
  const names = Object.keys(zip);

  it('contains the kit under one folder, including nested skills', () => {
    expect(names).toContain('production-kit/README.md');
    expect(names).toContain('production-kit/CLAUDE.md');
    expect(names.some((n) => /^production-kit\/skills\/[^/]+\/SKILL\.md$/.test(n))).toBe(true);
    expect(names.every((n) => n.startsWith('production-kit/'))).toBe(true);
  });

  it('leaves out the sales copy', () => {
    expect(names.some((n) => n.endsWith('SALES-PAGE.md'))).toBe(false);
  });
});

describe('copy', () => {
  it('formats the price without trailing zeros', () => {
    expect(kitPrice).toBe('$9');
  });

  it('puts the download link in both parts of the email', () => {
    const link = downloadUrl('https://anadithakur.in', 'cs_test_abc123def456');
    const email = renderKitEmail(link);
    expect(email.text).toContain(link);
    expect(email.html).toContain(link);
  });
});
