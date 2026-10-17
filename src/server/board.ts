import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorLog } from '../lib/monitoring/with-error-log.js';
import { boardColumns } from '../lib/tickets/board.js';
import { ticketStore } from '../lib/tickets/store.js';

/**
 * GET /api/board
 *
 * The homepage's live board. Reads the `public_board` view only (number,
 * category, stack, stage, updated: nothing that identifies a person) and
 * groups it into the five stage columns.
 *
 * 200 { columns, total } (cached 5 min) | 405 | 501 { error: 'tickets not configured' }
 */
export default withErrorLog('board', async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const store = ticketStore();
  if (!store) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(501).json({ error: 'tickets not configured' });
  }
  const rows = await store.publicBoard();
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(boardColumns(rows));
});
