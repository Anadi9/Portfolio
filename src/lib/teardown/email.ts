import { CLOSING, DOC_KIND, DOC_TITLE, END_MARK, STATE_LABEL, clause, docRef, issuedOn, metaRows } from './document.js';
import { QUESTIONS } from './questions.js';
import type { ReportModel, SectionReport } from './report.js';

/**
 * The emailed report, and the copy of it the reader can keep.
 *
 * Two documents come out of here. `html` is the body, which has to survive
 * Gmail, Outlook and Apple Mail: table layout, every rule inlined on its
 * element, because email clients strip `<style>` blocks unpredictably and
 * support neither CSS variables nor `@media`. `attachment` is the same
 * document as a standalone file, which is opened in a browser rather than a
 * mail client and can therefore use a stylesheet and a print sheet — that file
 * is the download, and it is deliberately only reachable from the inbox.
 *
 * The hex values are hand copies of `tokens.ts`, because that module exports
 * React `CSSProperties` objects, which an email string cannot consume.
 *
 * Like every other module downstream of the question bank, this one only ever
 * copies findings. It states what was found and links to the paid teardown
 * once, at the end. It does not tell anyone what to do.
 */

export const ORIGIN = 'https://anadithakur.in';

const INK = '#0a0a0a';
/** The sheet, and the surface it is laid on. A report is a piece of paper. */
const PAPER = '#ffffff';
const DESK = '#E4DED0';
const EDGE = '#DCD6C8';
const GOLD = '#8A6A2A';
const DIM = '#6b6b6b';

const SANS = 'Helvetica,Arial,sans-serif';
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

/** Findings are authored, not user input, but escaping costs nothing and means
 *  a bracket added to a finding later cannot break the document. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rule = (color = EDGE) => `border-top:1px solid ${color};`;
const lab = (size: number, color: string) =>
  `font:700 ${size}px/1.4 ${MONO};letter-spacing:0.14em;text-transform:uppercase;color:${color};`;

/* ------------------------------------------------------------------ body -- */

const metaBlock = (model: ReportModel, issued: string) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${metaRows(model, issued)
                  .map(
                    (r) => `<tr>
                  <td width="110" valign="top" style="padding:6px 12px 6px 0;${lab(9, DIM)}">${esc(r.label)}</td>
                  <td valign="top" style="padding:6px 0;font:700 12px/1.4 ${MONO};color:${INK};">${esc(r.value)}</td>
                </tr>`,
                  )
                  .join('\n                ')}
              </table>`;

const indexBlock = (model: ReportModel) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${rule(INK)}">
                <tr>
                  <td width="34" style="padding:8px 0;${lab(9, DIM)}">&sect;</td>
                  <td style="padding:8px 0;${lab(9, DIM)}">Section</td>
                  <td align="right" style="padding:8px 0;${lab(9, DIM)}">State</td>
                  <td align="right" width="52" style="padding:8px 0;${lab(9, DIM)}">Score</td>
                </tr>
                ${model.sections
                  .map(
                    (s) => `<tr>
                  <td width="34" style="padding:7px 0;${rule()}font:700 11px/1.4 ${MONO};color:${GOLD};">${clause(s.id)}</td>
                  <td style="padding:7px 0;${rule()}font:700 13px/1.4 ${SANS};color:${INK};">${esc(s.title)}</td>
                  <td align="right" style="padding:7px 0;${rule()}font:400 10px/1.4 ${MONO};letter-spacing:0.08em;color:${DIM};">${esc(STATE_LABEL[s.state])}</td>
                  <td align="right" width="52" style="padding:7px 0;${rule()}font:700 12px/1.4 ${MONO};color:${INK};">${s.score}</td>
                </tr>`,
                  )
                  .join('\n                ')}
              </table>`;

const sectionBlock = (s: SectionReport) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${rule(INK)}">
                <tr>
                  <td style="padding:20px 0 4px;">
                    <span style="${lab(11, GOLD)}">${clause(s.id)}</span>
                    <span style="font:700 15px/1.4 ${SANS};letter-spacing:0.01em;text-transform:uppercase;color:${INK};">&nbsp;&nbsp;${esc(s.title)}</span>
                  </td>
                  <td align="right" valign="top" style="padding:20px 0 4px;font:700 11px/1.6 ${MONO};letter-spacing:0.08em;color:${DIM};">
                    ${esc(STATE_LABEL[s.state])} &middot; <span style="color:${INK};">${s.score}/100</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:0 0 18px;">
                ${s.findings
                  .map(
                    (f, i) => `<tr>
                  <td width="42" valign="top" style="padding:6px 10px 6px 0;font:400 10px/1.7 ${MONO};color:${GOLD};">${clause(s.id, i)}</td>
                  <td valign="top" style="padding:6px 0;font:400 14px/1.6 ${SANS};color:#1a1a1a;">${esc(f)}</td>
                </tr>`,
                  )
                  .join('\n                ')}
              </table>`;

export function renderEmail(
  model: ReportModel,
  now: Date = new Date(),
): { subject: string; html: string; attachment: { filename: string; html: string } } {
  const { result } = model;
  const issued = issuedOn(now);
  const ref = docRef(model);

  const subject = `Your Wrapper Test: ${result.verdict} · ${result.score}/100`;

  const undecidedLine =
    result.undecidedCount > 0
      ? `<p style="margin:14px 0 0;font:400 14px/1.6 ${SANS};color:${DIM};">
                      ${result.undecidedCount} of ${QUESTIONS.length} answers were "I'm not sure". Those are recorded separately from low
                      scores, because an undecided question and a badly decided one are different problems.
                    </p>`
      : '';

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
  <body style="margin:0;padding:0;background:${DESK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DESK};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${PAPER};border:1px solid ${EDGE};">
            <tr>
              <td style="padding:28px 28px 0;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="${lab(9, GOLD)}">Technical report</td>
                    <td align="right" style="${lab(9, DIM)}">${esc(ref)}</td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;${rule(INK)}">
                  <tr>
                    <td style="padding:18px 0 0;">
                      <h1 style="margin:0;font:700 30px/1.05 ${SANS};letter-spacing:-0.02em;text-transform:uppercase;color:${INK};">
                        ${esc(DOC_TITLE)}
                      </h1>
                      <p style="margin:6px 0 0;${lab(10, DIM)}">${esc(DOC_KIND)}</p>
                      <p style="margin:18px 0 0;font:700 20px/1.2 ${SANS};color:${INK};">
                        ${esc(result.verdict)}
                      </p>
                      <p style="margin:6px 0 0;font:700 13px/1.4 ${MONO};color:${GOLD};">
                        ${result.score}<span style="color:${DIM};">/100</span>
                      </p>
                      ${undecidedLine}
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;${rule()}">
                  <tr><td style="padding:14px 0 0;">
${metaBlock(model, issued)}
                  </td></tr>
                </table>

                <p style="margin:26px 0 8px;${lab(9, DIM)}">Section index</p>
${indexBlock(model)}

                <p style="margin:30px 0 0;${lab(9, DIM)}">Findings</p>
${model.sections.map(sectionBlock).join('\n')}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${rule(INK)}">
                  <tr>
                    <td style="padding:22px 0 0;">
                      <p style="margin:0 0 16px;font:400 14px/1.6 ${SANS};color:#1a1a1a;">
                        ${esc(CLOSING)}
                      </p>
                      <a href="${ORIGIN}/rescue/audit"
                         style="display:inline-block;padding:14px 18px;background:${INK};color:${PAPER};font:700 11px/1 ${MONO};letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">
                        Get a free audit
                      </a>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;${rule()}">
                  <tr>
                    <td style="padding:14px 0 24px;">
                      <p style="margin:0;font:400 12px/1.6 ${SANS};color:${DIM};">
                        <strong style="color:${INK};">Your copy is attached to this email.</strong>
                        ${esc(attachmentName(model))} opens in any browser and prints to PDF. It is only
                        here: the page you filled in does not keep one.
                      </p>
                      <p style="margin:14px 0 0;${lab(9, DIM)}">${esc(END_MARK)} &middot; ${esc(ref)} &middot; ${esc(issued)}</p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, attachment: { filename: attachmentName(model), html: renderAttachment(model, now) } };
}

/** `wrapper-test-WT-13-072-B.html`: the reference, made safe for a filename. */
export function attachmentName(model: ReportModel) {
  return `wrapper-test-${docRef(model).replace(/[^A-Za-z0-9-]/g, '-')}.html`;
}

/* ------------------------------------------------------ the kept document -- */

/**
 * The attached copy. Opened in a browser, not a mail client, so it gets a real
 * stylesheet and a print sheet — the same document, set as a sheet of paper.
 */
export function renderAttachment(model: ReportModel, now: Date = new Date()): string {
  const { result } = model;
  const issued = issuedOn(now);
  const ref = docRef(model);

  const rows = metaRows(model, issued)
    .map(
      (r) =>
        `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`,
    )
    .join('\n        ');

  const index = model.sections
    .map(
      (s) =>
        `<tr><td class="num">${clause(s.id)}</td><td>${esc(s.title)}</td><td class="state">${esc(
          STATE_LABEL[s.state],
        )}</td><td class="num right">${s.score}</td></tr>`,
    )
    .join('\n        ');

  const sections = model.sections
    .map(
      (s) => `<section class="sec">
        <div class="sec-head">
          <span class="num gold">${clause(s.id)}</span>
          <h2>${esc(s.title)}</h2>
          <span class="state">${esc(STATE_LABEL[s.state])} &middot; <b>${s.score}/100</b></span>
        </div>
        <dl class="findings">
          ${s.findings
            .map(
              (f, i) =>
                `<dt class="num gold">${clause(s.id, i)}</dt><dd>${esc(f)}</dd>`,
            )
            .join('\n          ')}
        </dl>
      </section>`,
    )
    .join('\n      ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(DOC_TITLE)} — ${esc(ref)}</title>
<style>
  :root { --ink:${INK}; --paper:${PAPER}; --desk:${DESK}; --edge:${EDGE}; --gold:${GOLD}; --dim:${DIM}; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--desk); color:var(--ink);
         font:400 15px/1.6 ${SANS}; -webkit-font-smoothing:antialiased; }
  .sheet { max-width:860px; margin:32px auto; background:var(--paper);
           border:1px solid var(--edge); padding:56px 56px 40px; }
  .masthead { display:flex; justify-content:space-between; gap:16px;
              font:700 10px/1.4 ${MONO}; letter-spacing:0.14em; text-transform:uppercase; color:var(--dim); }
  .masthead .series { color:var(--gold); }
  h1 { margin:22px 0 0; font:700 clamp(30px,5vw,52px)/1.02 ${SANS};
       letter-spacing:-0.03em; text-transform:uppercase; }
  .kind { margin:8px 0 0; font:700 10px/1.4 ${MONO}; letter-spacing:0.16em;
          text-transform:uppercase; color:var(--dim); }
  .verdict { margin:26px 0 0; font:700 clamp(19px,2.6vw,26px)/1.2 ${SANS}; }
  .score { margin:8px 0 0; font:700 15px/1.4 ${MONO}; color:var(--gold); }
  .score span { color:var(--dim); }
  .note { margin:16px 0 0; max-width:62ch; color:#3a3a3a; }
  hr { border:0; border-top:1px solid var(--ink); margin:28px 0 0; }
  .label { margin:34px 0 10px; font:700 10px/1.4 ${MONO}; letter-spacing:0.16em;
           text-transform:uppercase; color:var(--dim); }
  table { width:100%; border-collapse:collapse; }
  .meta th { width:150px; text-align:left; padding:7px 14px 7px 0; vertical-align:top;
             font:700 10px/1.6 ${MONO}; letter-spacing:0.12em; text-transform:uppercase; color:var(--dim); }
  .meta td { padding:7px 0; font:700 13px/1.6 ${MONO}; }
  .index { border-top:1px solid var(--ink); }
  .index td { padding:9px 0; border-bottom:1px solid var(--edge); }
  .num { font:700 12px/1.4 ${MONO}; width:46px; }
  .gold { color:var(--gold); }
  .right { text-align:right; width:60px; }
  .state { font:400 10px/1.4 ${MONO}; letter-spacing:0.1em; text-transform:uppercase; color:var(--dim);
           text-align:right; white-space:nowrap; }
  .state b { color:var(--ink); }
  .sec { border-top:1px solid var(--ink); padding:22px 0 6px; break-inside:avoid; }
  .sec-head { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; }
  .sec-head h2 { margin:0; font:700 17px/1.3 ${SANS}; letter-spacing:0.01em; text-transform:uppercase; }
  .sec-head .state { margin-left:auto; }
  .findings { display:grid; grid-template-columns:46px 1fr; gap:8px 0; margin:16px 0 0; }
  .findings dt { font:400 10px/1.9 ${MONO}; }
  .findings dd { margin:0; max-width:70ch; color:#1a1a1a; }
  .close { border-top:1px solid var(--ink); margin-top:0; padding:24px 0 0; }
  .close p { margin:0; max-width:66ch; }
  .foot { margin:30px 0 0; padding-top:14px; border-top:1px solid var(--edge);
          font:700 10px/1.4 ${MONO}; letter-spacing:0.14em; text-transform:uppercase; color:var(--dim);
          display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  @media (max-width:640px) { .sheet { margin:0; border:0; padding:32px 20px; } }
  @media print {
    body { background:#fff; }
    .sheet { margin:0; border:0; max-width:none; padding:0; background:#fff; }
    .sec { break-inside:avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="masthead"><span class="series">Technical report</span><span>${esc(ref)}</span></div>
    <h1>${esc(DOC_TITLE)}</h1>
    <p class="kind">${esc(DOC_KIND)}</p>
    <hr />
    <p class="verdict">${esc(result.verdict)}</p>
    <p class="score">${result.score}<span>/100</span></p>
    ${
      result.undecidedCount > 0
        ? `<p class="note">${result.undecidedCount} of ${QUESTIONS.length} answers were &ldquo;I&rsquo;m not sure&rdquo;. Those are recorded separately from low scores, because an undecided question and a badly decided one are different problems.</p>`
        : ''
    }

    <p class="label">Document</p>
    <table class="meta">
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p class="label">Section index</p>
    <table class="index">
      <tbody>
        ${index}
      </tbody>
    </table>

    <p class="label">Findings</p>
      ${sections}

    <div class="close">
      <p>${esc(CLOSING)}</p>
    </div>

    <div class="foot"><span>${esc(END_MARK)}</span><span>${esc(ref)} &middot; ${esc(issued)}</span></div>
  </div>
</body>
</html>`;
}
