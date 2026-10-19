import type { InvoicePlan } from './invoices.js';

export type InvoiceStatus = 'planned' | 'sent' | 'paid' | 'void';
export type Invoice = InvoicePlan & { id: string; ticketId: string; currency: 'usd' | 'inr'; status: InvoiceStatus; invoiceRef: string | null; createdAt: string };
