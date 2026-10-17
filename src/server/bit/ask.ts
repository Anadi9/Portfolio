import { createAskHandler } from '../../lib/bit/ask-handler.js';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';

/**
 * POST /api/bit/ask — Bit's AI answer to a typed question.
 *
 * Off unless `BIT_AI=on` (501, and the chat keeps its keyword routing). The
 * handler, its limits and checks live in `src/lib/bit/ask-handler.ts`.
 */
export default withErrorLog('bit-ask', createAskHandler());
