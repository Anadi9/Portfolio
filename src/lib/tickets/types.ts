import { z } from 'zod';
import type { CoachTask, Commitment } from '../coach/types.js';

export const TICKET_KINDS = ['first_bug', 'audit', 'build', 'care', 'question', 'teardown'] as const;
export const TICKET_STAGES = ['inbox', 'bug_review', 'audit', 'fixing', 'live', 'closed'] as const;
export const TICKET_SOURCES = ['bit', 'audit_form', 'app_form'] as const;
export const CHANNELS = ['email', 'whatsapp'] as const;

export type TicketKind = (typeof TICKET_KINDS)[number];
export type TicketStage = (typeof TICKET_STAGES)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];
export type Channel = (typeof CHANNELS)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** What a form or Bit sends to create a ticket. Task 6's API validates with this. */
export const NewTicketSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: optionalText(120),
  company: optionalText(120),
  whatsapp: optionalText(40),
  appUrl: optionalText(500),
  kind: z.enum(TICKET_KINDS),
  stack: optionalText(120),
  answers: z.record(z.string(), z.unknown()),
  budget: optionalText(120),
  boardOptIn: z.boolean().default(false),
  whatsappOptIn: z.boolean().default(false),
  source: z.enum(TICKET_SOURCES),
  category: optionalText(120),
});
export type NewTicket = z.input<typeof NewTicketSchema>;

export type Ticket = {
  id: string;
  number: string;
  clientId: string;
  kind: TicketKind;
  stage: TicketStage;
  appUrl: string | null;
  stack: string | null;
  answers: Record<string, unknown>;
  budget: string | null;
  boardOptIn: boolean;
  whatsappOptIn: boolean;
  source: TicketSource;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type NewNotification = {
  ticketId: string;
  channel: Channel;
  template: string;
  payload?: Record<string, unknown>;
};

export type Notification = {
  id: string;
  ticketId: string;
  channel: Channel;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

/** One row of the public board: nothing that identifies a person or a business. */
export type BoardTicket = {
  number: string;
  /** Non-identifying enum; the board derives a label from it when `category` is empty. */
  kind: TicketKind;
  category: string | null;
  stack: string | null;
  stage: TicketStage;
  updatedAt: string;
};

export type Scorecard = { runAt: string; results: Record<string, unknown> };

export type TicketEvent = { type: string; data: Record<string, unknown>; at: string };

export type MessageStatus = 'draft' | 'sent' | 'failed';

export type Message = {
  id: string;
  ticketId: string;
  direction: 'in' | 'out';
  kind: string;
  status: MessageStatus;
  body: string;
  channel: Channel;
  createdAt: string;
  sentAt: string | null;
};

/** Everything `/admin` shows for one ticket. Contact details never leave the server except to Anadi's session. */
export type TicketDetail = Ticket & {
  client: { name: string | null; email: string; whatsapp: string | null };
  events: TicketEvent[];
  messages: Message[];
  /** The latest brief's body, or null before `processTicket` has run. */
  brief: Record<string, unknown> | null;
  commitments: Commitment[];
  tasks: CoachTask[];
};

/** One line of the Tickets tab. */
export type TicketRow = Pick<Ticket, 'id' | 'number' | 'kind' | 'stage' | 'appUrl' | 'createdAt' | 'updatedAt'> & {
  clientName: string | null;
  clientEmail: string;
  hasBrief: boolean;
  firstReplySentAt: string | null;
};
