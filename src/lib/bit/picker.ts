/**
 * The hero's service picker from the Bit's Quest design: five cartridges,
 * ← → to choose (Bit hops above the one selected), Enter to start the chat on
 * that topic. Each `start` is a label of Bit's first menu, so the chat
 * continues exactly as if that option had been tapped.
 */

export type Cartridge = { level: string; name: string; price: string; solves: string; bit: string; start: string };

export const CARTRIDGES: Cartridge[] = [
  {
    level: 'Fix',
    name: 'App rescue',
    price: 'Audit $349',
    solves: 'Apps that break, leak or slow down',
    bit: 'Lovable, Bolt, Cursor or hand-coded. Login, data, payments, deploys, speed.',
    start: 'Something’s breaking in my app',
  },
  {
    level: 'Fix',
    name: 'Launch readiness',
    price: '$1,500–$2,500',
    solves: 'Launch-day surprises',
    bit: 'Security, payments, monitoring and load, checked and fixed before real users arrive.',
    start: 'I’m about to launch',
  },
  {
    level: 'Build',
    name: 'Build with AI',
    price: '$2,000–$8,000',
    solves: 'AI that’s expensive, slow or wrong',
    bit: 'Assistants that answer from your data, smart search and automations, with guardrails.',
    start: 'Add AI to my product',
  },
  {
    level: 'Keep',
    name: 'Care plan',
    price: '$299/mo',
    solves: 'Things breaking after launch',
    bit: 'Monitoring, a monthly health review and small fixes, by a senior engineer.',
    start: 'Look after my live app',
  },
  {
    level: 'Free',
    name: 'Free tools',
    price: 'Free',
    solves: 'Getting started for free',
    bit: 'The first-bug video, the Wrapper Test and the audit checklist.',
    start: 'Show me the free stuff',
  },
];

/** The cartridge a key moves to, or null when the key isn't for the picker. */
export function nextIndex(i: number, key: string, n: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(n - 1, i + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, i - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return null;
}
