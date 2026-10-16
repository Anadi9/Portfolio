/**
 * Tests must never reach a real backend. A developer's shell or `.env.local`
 * can carry live Supabase / WhatsApp credentials, and handlers that
 * best-effort create tickets would otherwise write to them. Tests that need a
 * store pass a fake (see src/lib/notify/*.test.ts).
 */
for (const key of [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ALERT_TO',
  'WHATSAPP_TEMPLATE_NEW_TICKET',
  'TICKETS_INBOX',
  'CRON_SECRET',
]) {
  delete process.env[key];
}
