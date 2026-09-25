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

/**
 * The delivery email for packs. Same plain shape as the old one: what they
 * bought, the one link, where to start. The link is their downloads page, which
 * lists everything bought with that address, so a second purchase sends the
 * same link again.
 */
export function renderPacksEmail(opts: { packNames: string[]; link: string; upgrade: string | null }): {
  subject: string;
  html: string;
  text: string;
} {
  const list = listOf(opts.packNames);
  const subject = `Your download: ${list}`;
  const upgradeLine = opts.upgrade && `Want everything? Upgrade to the full kit for ${opts.upgrade} from your downloads page.`;
  const text = [
    `Thanks for buying ${list}.`,
    '',
    `Your downloads: ${opts.link}`,
    '',
    'Keep this link. It lists everything you’ve bought with this email address, in every version published so far.',
    'Start with README.md: it has the install steps for your tool.',
    ...(upgradeLine ? ['', upgradeLine] : []),
    '',
    'Reply to this email if anything is unclear or broken.',
    '',
    'Anadi',
  ].join('\n');
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0a0a0a;max-width:560px">
<p>Thanks for buying ${escapeHtml(list)}.</p>
<p><a href="${escapeAttr(opts.link)}" style="display:inline-block;padding:12px 20px;background:#0a0a0a;color:#E4DED0;text-decoration:none;font-weight:700;letter-spacing:.06em">YOUR DOWNLOADS</a></p>
<p>Keep this link. It lists everything you’ve bought with this email address, in every version published so far. Start with <code>README.md</code>: it has the install steps for your tool.</p>
${upgradeLine ? `<p>${escapeHtml(upgradeLine)}</p>\n` : ''}<p>Reply to this email if anything is unclear or broken.</p>
<p>Anadi</p>
</div>`;
  return { subject, html, text };
}

/** `A`, `A and B`, `A, B and C`. */
const listOf = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
