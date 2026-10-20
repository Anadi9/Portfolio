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

  it('keeps the How-was-it-built options unchanged', () => {
    expect(NODES.prod.opts.map((o) => o.label)).toEqual(['Hand-coded (React / Node)', 'Cursor or Claude Code', 'Lovable, Bolt or v0', 'Replit', 'Not sure']);
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
    expect(s.log.at(-1)).toEqual({ who: 'form', kind: 'first_bug' });
    expect(JSON.stringify(s.log)).not.toMatch(/A-10\d\d|ticket #/i);
  });

  it('recommends the sprint from the production questions and pre-ticks launch', () => {
    let s = pick(initial(), 'I’m about to launch');
    s = pick(s, 'Lovable, Bolt or v0');
    s = pick(s, 'Not yet — launching soon');
    s = pick(s, 'Lots, or not sure');
    expect(s.node).toBe('prod4');
    s = pick(s, 'Not sure yet');
    expect(s.node).toBe('recProd');
    const rec = s.log.find((m) => m.who === 'rec');
    expect(rec).toMatchObject({ rec: { title: 'Launch-ready sprint', price: 'Fixed quote' } });
    if (rec?.who === 'rec') expect(rec.rec.actions[0].to).toEqual({ href: '/audit?type=app&s=5' });
  });

  it('asks an optional budget in the Fix and AI flows, records it, and never prices from it', () => {
    let s = pick(initial(), 'Add AI to my product');
    s = pick(s, 'Answer questions from our data');
    s = pick(s, 'Still building');
    expect(s.node).toBe('ai3');
    s = pick(s, 'A small, focused fix');
    expect(s.node).toBe('recAi');
    expect(s.ans.budget).toBe('A small, focused fix');
    expect(decodeURIComponent(mailto('x', s.ans))).toContain('Budget: A small, focused fix');
    const published = ['$349', 'Fixed quote'];
    for (const b of ['A small, focused fix', 'A few weeks of work', 'A bigger build', 'Not sure yet']) {
      const rec = reply('recAi', { ...s.ans, budget: b }).find((m) => m.who === 'rec');
      if (rec?.who !== 'rec') throw new Error('no rec');
      expect(published.some((p) => rec.rec.price.startsWith(p))).toBe(true);
      expect(JSON.stringify(rec)).not.toContain(b);
    }
  });

  it('ends Care and quote requests at the in-chat ticket form, not a mailto link', () => {
    let s = pick(initial(), 'Look after my live app');
    s = pick(s, 'Start Care');
    expect(s.node).toBe('quote');
    expect(s.log.at(-1)).toEqual({ who: 'form', kind: 'question' });

    s = pick(pick(pick(pick(initial(), 'Add AI to my product'), 'Answer questions from our data'), 'Still building'), 'Not sure yet');
    const rec = s.log.find((m) => m.who === 'rec');
    if (rec?.who !== 'rec') throw new Error('no rec');
    const quote = rec.rec.actions.find((a) => a.label === 'Get a fixed quote') as Option;
    expect(choose(s, quote)?.node).toBe('quote');
    for (const id of Object.keys(NODES) as (keyof typeof NODES)[]) {
      for (const a of reply(id, {}).flatMap((m) => (m.who === 'rec' ? m.rec.actions : []))) expect(JSON.stringify(a.to)).not.toContain('mailto:');
    }
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
