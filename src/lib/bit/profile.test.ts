import { describe, expect, it, vi } from 'vitest';
import { loadProfile, profileFor, saveProfile, PROFILE_EVENT } from './profile';
import { PRICE_GROUPS, SERVICES } from '../../data/bitsQuestFacts';

describe('profileFor', () => {
  it('maps each recommendation to the page’s cards', () => {
    expect(profileFor('recProd', {})).toEqual({ service: 'Fix · rescue & launch', pkg: 'Launch-ready sprint', area: 'Reliability & security', bug: 'leak', topic: 'Production' });
    expect(profileFor('recVis', {})).toMatchObject({ pkg: 'Production audit', area: 'Search & AI visibility', bug: 'ai', topic: 'AI visibility' });
    expect(profileFor('recDpdp', {})).toMatchObject({ area: 'Privacy & compliance', bug: 'consent', topic: 'Privacy' });
    expect(profileFor('recAi', { aiwant: 'Build something new' })).toMatchObject({ service: 'Build with AI', pkg: 'AI build', bug: null });
    expect(profileFor('recAi', { aiwant: 'Fix an AI feature that misbehaves' })).toMatchObject({ pkg: 'Production audit' });
    expect(profileFor('start', {})).toBeNull();
  });

  it('only names cards and packages that exist', () => {
    const services = SERVICES.map((s) => s.tag);
    const pkgs = PRICE_GROUPS.flatMap((g) => g.packages.map((p) => p.name));
    for (const node of ['recProd', 'recVis', 'recDpdp', 'recAi'] as const) {
      const p = profileFor(node, {})!;
      expect(services).toContain(p.service);
      expect(pkgs).toContain(p.pkg);
    }
  });
});

describe('profile storage', () => {
  it('saves to session storage and tells the page', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const target = { dispatchEvent: vi.fn() };
    const p = profileFor('recProd', {})!;
    saveProfile(p, storage, target);
    expect(loadProfile(storage)).toEqual(p);
    expect(target.dispatchEvent.mock.calls[0][0].type).toBe(PROFILE_EVENT);
  });

  it('survives broken or blocked storage', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadProfile(throwing)).toBeNull();
    expect(() => saveProfile(profileFor('recProd', {})!, throwing, { dispatchEvent: () => true })).not.toThrow();
    expect(loadProfile({ getItem: () => '{not json', setItem: () => {} })).toBeNull();
  });
});
