import { promiseHours } from '../../data/promises.js';
import { PRICE_PLACEHOLDER } from '../brief/draft.js';
import type { EngineResult } from './combine.js';
import { AREA_LABEL, AREAS } from './types.js';

/**
 * The audit report skeleton, drafted from the engine's findings. It is a
 * draft with `[ANADI: …]` and `[PRICE]` placeholders, so /admin refuses to
 * send it until Anadi has read, edited and priced it.
 */

const CHECK = '[ANADI: confirm or remove]';

export function draftReport({ number, appUrl, result }: { number: string; appUrl: string | null; result: EngineResult }): { subject: string; body: string } {
  const app = appUrl?.trim() || 'your app';
  const days = promiseHours('audit_credit') / 24;
  const lines: string[] = ['Hi,', ''];

  if (!result.findings.length) {
    lines.push(
      `I've finished the production audit of ${app}. No real issues found in what I checked.`,
      '',
      `As promised, that means a full refund of the $349. ${CHECK}`,
    );
  } else {
    lines.push(`I've finished the production audit of ${app}. Here is what to fix first, ranked by what it could cost you:`, '');
    result.top.forEach((f, i) => lines.push(`${i + 1}. ${f.title}`));
    for (const area of AREAS) {
      const mine = result.findings.filter((f) => f.area === area);
      if (!mine.length) continue;
      lines.push('', `${AREA_LABEL[area]}${result.areas[area].score != null ? ` (${result.areas[area].score}/100)` : ''}`);
      for (const f of mine) {
        lines.push(`- ${f.title}. ${f.detail}`.trim());
        if (f.fix) lines.push(`  Fix: ${f.fix}`);
      }
      lines.push(CHECK);
    }
    lines.push('', `Fixed price to fix the above: ${PRICE_PLACEHOLDER}. The $349 audit is credited in full if you book the fix within ${days} days.`);
  }

  const unchecked = AREAS.filter((a) => result.areas[a].score === null).map((a) => AREA_LABEL[a]);
  if (unchecked.length) lines.push('', `Not checked in this report: ${unchecked.join(', ')}.`);
  lines.push('', 'Reply with any questions.', '', 'Anadi');
  return { subject: `Your production audit: ${app} (${number})`, body: lines.join('\n') };
}
