import { z } from 'zod';

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
  category: string | null;
  stack: string | null;
  stage: TicketStage;
  updatedAt: string;
};

export type Scorecard = { runAt: string; results: Record<string, unknown> };
