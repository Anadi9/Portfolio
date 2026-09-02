import { QUESTIONS } from './questions';
import type { ReportModel, SectionReport } from './report';

/**
 * The emailed report.
 *
 * Every rule is inlined on its element: email clients strip `<style>` blocks
 * unpredictably and support neither CSS variables nor `@media`. The hex values
 * are hand copies of `tokens.ts` — that module exports React `CSSProperties`
 * objects, which an email string cannot consume.
 *
 * Like every other module downstream of the question bank, this one only ever
 * copies findings. It states what was found and links to the paid teardown
 * once, at the end. It does not tell anyone what to do.
 */

export const ORIGIN = 'https://anadithakur.in';

const INK = '#0a0a0a';
const CREAM = '#E4DED0';
const GOLD = '#C9A24B';
const DIM = '#9a9a9a';
const RULE = '#2a2a2a';

/** Findings are authored, not user input — but escaping costs nothing and means
 *  a bracket added to a finding later cannot break the document. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STATE_LABEL: Record<SectionReport['state'], string> = {
  decided: 'Decided',
  undecided: 'Not decided yet',
  mixed: 'Partly decided',
};

const sectionBlock = (s: SectionReport) => `
      <tr>
        <td style="padding:24px 0;border-top:1px solid ${RULE};">
          <p style="margin:0 0 6px;font:700 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">
            ${s.id}. ${esc(s.title)}
          </p>
          <p style="margin:0 0 14px;font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;color:${DIM};">
            ${esc(STATE_LABEL[s.state])} &middot; ${s.score}/100
          </p>
          ${s.findings
            .map(
              (f) =>
                `<p style="margin:0 0 10px;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:#e4e4e4;">${esc(f)}</p>`,
            )
            .join('\n          ')}
        </td>
      </tr>`;

export function renderEmail(model: ReportModel): { subject: string; html: string } {
  const { result, sections } = model;

  const subject = `Your Wrapper Test: ${result.verdict} — ${result.score}/100`;

  const undecidedLine =
    result.undecidedCount > 0
      ? `<p style="margin:14px 0 0;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${DIM};">
             ${result.undecidedCount} of ${QUESTIONS.length} answers were "I'm not sure". Those are recorded separately from low
             scores, because an undecided question and a badly decided one are different problems.
           </p>`
      : '';

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
  <body style="margin:0;padding:0;background:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td style="padding-bottom:28px;">
                <p style="margin:0 0 10px;font:700 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:${GOLD};">
                  THE WRAPPER TEST
                </p>
                <h1 style="margin:0;font:700 34px/1.1 Helvetica,Arial,sans-serif;text-transform:uppercase;color:${CREAM};">
                  ${esc(result.verdict)}
                </h1>
                <p style="margin:10px 0 0;font:700 15px/1.4 Helvetica,Arial,sans-serif;color:#ffffff;">
                  ${result.score}/100
                </p>
                ${undecidedLine}
              </td>
            </tr>
            ${sections.map(sectionBlock).join('')}
            <tr>
              <td style="padding:28px 0 0;border-top:1px solid ${RULE};">
                <p style="margin:0 0 18px;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${DIM};">
                  That is what the answers show. What to change first, in what order, and what it costs to
                  get wrong is the recorded teardown.
                </p>
                <a href="${ORIGIN}/work-with-me"
                   style="display:inline-block;padding:16px 20px;background:${CREAM};color:${INK};font:700 11px/1 Helvetica,Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">
                  See the teardown
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
