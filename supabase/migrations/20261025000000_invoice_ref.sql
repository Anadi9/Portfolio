-- The invoice's reference is no longer tied to Stripe: Anadi sends invoices
-- with whatever tool he uses and pastes its number here. Run once, after
-- 20261023000000_invoices.sql. Renaming keeps any value and the length check.

alter table public.invoices rename column stripe_invoice_id to invoice_ref;
