/**
 * Bit's keyword routing for typed questions: the first matching topic wins;
 * anything unrecognised goes to Anadi. Pure and import-free apart from the node
 * ids, so both the chat (`chat.ts`) and the AI function (`api/bit/ask.ts`, for
 * its fallback route) can use it.
 */
import type { NodeId } from './nodes.js';

const ROUTES: [RegExp, NodeId | 'tour', string][] = [
  [/tour|show me around|explore|look around/, 'tour', 'Sure — let’s take a walk.'],
  [/dpdp|consent|privacy|personal data|gdpr|complian|cookie|delete/, 'dpdp', 'That’s a privacy question — two quick taps and I’ll point you right.'],
  [/add ai|ai feature|chatbot|agent|automat|\brag\b|llm|assistant|openai|ai model|copilot/, 'ai', 'You want AI in your product — two quick questions:'],
  [/maintain|maintenance|retainer|monitor|care plan|ongoing|look after/, 'care', 'Ongoing care — here’s how it works:'],
  [/chatgpt|perplexity|gemini|claude|\bai\b|seo|cited|citation|visib|google|rank|llms/, 'vis', 'Sounds like AI visibility. Two quick questions:'],
  [/wrapper|teardown|defensib/, 'teardown', 'You’re after the Wrapper Test or the teardown:'],
  [/kit|rules|checklist|template|diy|myself/, 'kit', 'Doing it yourself? That’s what the Production Kit is for.'],
  [/blog|post|article|read/, 'blog', 'Here are Anadi’s field notes:'],
  [/price|cost|budget|package|quote|how much|cheap/, 'start', 'Prices are fixed and public — the pricing table has all six. Or tell me what’s going on:'],
  [/free|tool|test|try/, 'free', 'Free things first — smart.'],
  [/bug|broke|break|crash|auth|login|supabase|firebase|deploy|slow|launch|lovable|cursor|bolt|v0|error|leak|security|hack/, 'prod', 'Sounds like a production problem. A few quick taps:'],
];

export function classify(q: string): { node: NodeId | 'tour'; say: string } {
  const s = q.toLowerCase();
  for (const [re, node, say] of ROUTES) if (re.test(s)) return { node, say };
  return { node: 'contact', say: 'Good question — that one’s for Anadi himself.' };
}
