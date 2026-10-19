import { waitUntil } from '../runtime/wait-until.js';
import type { TicketStore } from '../tickets/store.js';
import { processTicket } from './process.js';

/**
 * Brief a new ticket after the response has gone: the host keeps the function
 * alive until the promise settles. A failure is logged; the daily cron picks
 * up any ticket still without a brief.
 */
export function processInBackground(store: TicketStore, ticketId: string): void {
  waitUntil(
    processTicket(store, ticketId).catch((err) => {
      console.error('[brief] background processing failed', ticketId, err);
    }),
  );
}
