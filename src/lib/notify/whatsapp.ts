import type { Notification } from '../tickets/types.js';
import type { SendResult } from './email.js';

/**
 * WhatsApp alert to Anadi through Meta's official Cloud API, as an approved
 * template message. Env-gated: any missing variable => skipped, never an error.
 */

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** Template parameters may not contain newlines or runs of spaces. */
const param = (s: unknown, max: number) => (typeof s === 'string' ? s : '').replace(/\s+/g, ' ').trim().slice(0, max) || '-';

export function whatsappPayload(row: Notification, env: Record<string, string | undefined>) {
  return {
    messaging_product: 'whatsapp',
    to: env.WHATSAPP_ALERT_TO,
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE_NEW_TICKET,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: param(row.payload.number, 20) },
            { type: 'text', text: param(row.payload.kind, 40) },
            { type: 'text', text: param(row.payload.summary, 60) },
          ],
        },
      ],
    },
  };
}

export async function sendWhatsAppNotification(
  row: Notification,
  fetchFn: FetchLike,
  env: Record<string, string | undefined>,
): Promise<SendResult> {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ALERT_TO, WHATSAPP_TEMPLATE_NEW_TICKET } = env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ALERT_TO || !WHATSAPP_TEMPLATE_NEW_TICKET) {
    return { status: 'skipped', error: 'WhatsApp env not set' };
  }
  if (row.template !== 'new_ticket_admin') return { status: 'skipped', error: `no whatsapp template for ${row.template}` };

  const res = await fetchFn(`https://graph.facebook.com/v21.0/${encodeURIComponent(WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(whatsappPayload(row, env)),
  });
  if (res.ok) return { status: 'sent' };
  let detail = '';
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    detail = body?.error?.message ? `: ${String(body.error.message).slice(0, 200)}` : '';
  } catch {
    /* no body */
  }
  return { status: 'failed', error: `whatsapp ${res.status}${detail}` };
}
