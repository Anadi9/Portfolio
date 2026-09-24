import { KIT } from './product.js';

/**
 * The delivery email. Deliberately plain: one link, what's in it, and where to
 * start. The thank-you page already handed over the download; this is the copy
 * that survives the tab being closed.
 */
export function renderKitEmail(link: string): { subject: string; html: string; text: string } {
  const subject = `Your download: ${KIT.name}`;
  const text = [
    `Thanks for buying ${KIT.name}.`,
    '',
    `Download it here: ${link}`,
    '',
    'The link is yours to keep, and it always serves the latest version of the kit.',
    'Start with README.md: it has the install steps for Claude Code, Cursor, Lovable and Bolt.',
    '',
    'Reply to this email if anything is unclear or broken.',
    '',
    'Anadi',
  ].join('\n');
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0a0a0a;max-width:560px">
<p>Thanks for buying ${KIT.name}.</p>
<p><a href="${escapeAttr(link)}" style="display:inline-block;padding:12px 20px;background:#0a0a0a;color:#E4DED0;text-decoration:none;font-weight:700;letter-spacing:.06em">DOWNLOAD THE KIT</a></p>
<p>The link is yours to keep, and it always serves the latest version of the kit. Start with <code>README.md</code>: it has the install steps for Claude Code, Cursor, Lovable and Bolt.</p>
<p>Reply to this email if anything is unclear or broken.</p>
<p>Anadi</p>
</div>`;
  return { subject, html, text };
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
