import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

/**
 * Anadi's passkeys for /admin, through SimpleWebAuthn. Kept behind this small
 * interface so the login flow can be tested without a real authenticator.
 */

export type StoredPasskey = { id: string; publicKey: string; counter: number; transports: string[]; createdAt: string };
export type Party = { rpID: string; origin: string };
type Json = Record<string, unknown>;

export type PasskeyDeps = {
  registrationOptions(party: Party, userName: string, existing: StoredPasskey[]): Promise<Json & { challenge: string }>;
  verifyRegistration(party: Party, response: unknown, challenge: string): Promise<{ id: string; publicKey: string; counter: number; transports: string[] } | null>;
  authenticationOptions(party: Party, existing: StoredPasskey[]): Promise<Json & { challenge: string }>;
  verifyAuthentication(party: Party, response: unknown, challenge: string, passkey: StoredPasskey): Promise<{ newCounter: number } | null>;
};

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));
type Transport = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export const webauthn: PasskeyDeps = {
  async registrationOptions(party, userName, existing) {
    return (await generateRegistrationOptions({
      rpName: 'Command centre',
      rpID: party.rpID,
      userName,
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    })) as unknown as Json & { challenge: string };
  },
  async verifyRegistration(party, response, challenge) {
    try {
      const r = await verifyRegistrationResponse({
        response: response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: challenge,
        expectedOrigin: party.origin,
        expectedRPID: party.rpID,
        requireUserVerification: true,
      });
      if (!r.verified) return null;
      const c = r.registrationInfo.credential;
      return { id: c.id, publicKey: b64(c.publicKey), counter: c.counter, transports: c.transports ?? [] };
    } catch {
      return null;
    }
  },
  async authenticationOptions(party, existing) {
    return (await generateAuthenticationOptions({
      rpID: party.rpID,
      allowCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as Transport[] })),
      userVerification: 'required',
    })) as unknown as Json & { challenge: string };
  },
  async verifyAuthentication(party, response, challenge, passkey) {
    try {
      const r = await verifyAuthenticationResponse({
        response: response as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
        expectedChallenge: challenge,
        expectedOrigin: party.origin,
        expectedRPID: party.rpID,
        credential: { id: passkey.id, publicKey: unb64(passkey.publicKey), counter: passkey.counter, transports: passkey.transports as Transport[] },
        requireUserVerification: true,
      });
      return r.verified ? { newCounter: r.authenticationInfo.newCounter } : null;
    } catch {
      return null;
    }
  },
};
