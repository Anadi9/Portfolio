import { describe, expect, it } from 'vitest';
import { ask, choose, classify, initial, mailto, NODES, optionsFor, qualify, reply, type ChatState, type Option } from './chat';

const pick = (state: ChatState, label: string): ChatState => {
  const opt = optionsFor(state.node).find((o) => o.label === label) as Option;
  expect(opt, `option "${label}" on ${state.node}`).toBeTruthy();
  const next = choose(state, opt);
  expect(next).not.toBeNull();
  return next as ChatState;
};

describe('Bit chat', () => {
  it('opens with the greeting and eight options', () => {
    const s = initial();
    expect(s.log[0]).toMatchObject({ who: 'bit', text: expect.stringContaining('I’m Bit') });
    expect(optionsFor('start')).toHaveLength(8);
  });

  it('qualifies three of four strong answers for the free review', () => {
    expect(qualify({ live: 'Live now', users: 'Paying customers', impact: 'Nothing much', when: 'This week' })).toBe('qurl');
    expect(qualify({ live: 'Just an idea for now', users: 'Only me and friends', impact: 'It’s embarrassing', when: 'This month' })).toBe('notyet');
  });

  it('walks the four questions to a real hand-off, never a fake ticket', () => {
    let s = pick(initial(), 'Find my app’s first bug — free');
    s = pick(s, 'Let’s go');
    s = pick(s, 'Live now');
    s = pick(s, 'Paying customers');
    s = pick(s, 'We lose money or users');
    s = pick(s, 'This week');
    expect(s.node).toBe('qurl');
    expect(s.ans).toMatchObject({ live: 'Live now', users: 'Paying customers', impact: 'We lose money or users', when: 'This week' });
    const links = s.log.at(-1);
    expect(links).toMatchObject({ who: 'links', links: [{ to: { href: '/audit?type=app' } }] });
    expect(JSON.stringify(s.log)).not.toMatch(/A-10\d\d|ticket #/i);
  });

  it('recommends the sprint from the production questions and pre-ticks launch', () => {
    let s = pick(initial(), 'I’m about to launch');
    s = pick(s, 'Lovable, Bolt or v0');
    s = pick(s, 'Not yet — launching soon');
    s = pick(s, 'Lots, or not sure');
    const rec = s.log.find((m) => m.who === 'rec');
    expect(rec).toMatchObject({ rec: { title: 'Launch-ready sprint', price: '$1,500–$2,500' } });
    if (rec?.who === 'rec') expect(rec.rec.actions[0].to).toEqual({ href: '/audit?type=app&s=5' });
  });

  it('routes free text by keyword, and the unknown to Anadi', () => {
    expect(classify('our supabase login is broken').node).toBe('prod');
    expect(classify('is our cookie banner GDPR ok').node).toBe('dpdp');
    expect(classify('add a chatbot to our docs').node).toBe('ai');
    expect(classify('why doesnt chatgpt mention us').node).toBe('vis');
    expect(classify('what is the meaning of life').node).toBe('contact');
    expect(ask(initial(), 'show me around')).toBe('tour');
    const s = ask(initial(), 'deploy keeps failing') as ChatState;
    expect(s.node).toBe('prod');
  });

  it('every option points at a real node or a real destination', () => {
    for (const [id, n] of Object.entries(NODES)) {
      for (const o of n.opts) {
        if ('node' in o.to) expect(NODES, `${id} → ${o.to.node}`).toHaveProperty(o.to.node);
        if ('href' in o.to) expect(o.to.href).toMatch(/^(\/|mailto:)/);
      }
    }
    expect(reply('start', {})[0]).toMatchObject({ who: 'bit' });
  });

  it('puts the answers into the email body', () => {
    const m = decodeURIComponent(mailto('Care plan', { stack: 'Replit', live: 'Live now' }));
    expect(m).toContain('subject=Care plan');
    expect(m).toContain('Built with: Replit');
    expect(m).toContain('Live?: Live now');
  });
});
