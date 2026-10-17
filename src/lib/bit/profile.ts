import type { BlogTopic, DemoBug } from '../../data/bitsQuest';
import type { Answers, NodeId } from './chat';

/**
 * What the visitor told Bit, carried across the homepage: "BIT'S PICK" on the
 * matching service card and package, "YOURS" on the matching audit area and
 * demo bug, and the blog filtered to their topic. Kept in sessionStorage (a
 * per-tab convenience; nothing leaves the browser) and announced with a
 * window event so sections already on screen update.
 */

export type Profile = {
  service: string;
  pkg: string;
  area: 'Reliability & security' | 'Search & AI visibility' | 'Privacy & compliance' | null;
  bug: DemoBug | null;
  topic: BlogTopic | null;
};

export const PROFILE_KEY = 'bit:profile';
export const PROFILE_EVENT = 'bq:profile';

const FIX = 'Fix · rescue & launch';

export function profileFor(node: NodeId, ans: Answers): Profile | null {
  switch (node) {
    case 'recProd':
      return { service: FIX, pkg: 'Launch-ready sprint', area: 'Reliability & security', bug: 'leak', topic: 'Production' };
    case 'recVis':
      return { service: FIX, pkg: 'Production audit', area: 'Search & AI visibility', bug: 'ai', topic: 'AI visibility' };
    case 'recDpdp':
      return { service: FIX, pkg: 'Production audit', area: 'Privacy & compliance', bug: 'consent', topic: 'Privacy' };
    case 'recAi':
      return { service: 'Build with AI', pkg: /Fix an AI/.test(ans.aiwant ?? '') ? 'Production audit' : 'AI build', area: null, bug: null, topic: null };
    default:
      return null;
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function saveProfile(p: Profile, storage?: Store, target?: Pick<EventTarget, 'dispatchEvent'>): void {
  try {
    (storage ?? window.sessionStorage).setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // Private mode or blocked storage: the badges still show for this page view.
  }
  try {
    (target ?? window).dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: p }));
  } catch {
    // no window (tests, SSR)
  }
}

export function loadProfile(storage?: Store): Profile | null {
  try {
    const raw = (storage ?? window.sessionStorage).getItem(PROFILE_KEY);
    const p = raw ? (JSON.parse(raw) as Profile) : null;
    return p && typeof p.service === 'string' && typeof p.pkg === 'string' ? p : null;
  } catch {
    return null;
  }
}
