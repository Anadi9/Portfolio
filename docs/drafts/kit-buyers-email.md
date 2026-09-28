# Draft: email to earlier Production Kit buyers

Status: **draft, not sent.** Anadi sends it, from his own inbox, after the
free kit is live.

## Who gets it

Everyone who paid for the kit and wasn't refunded:

- **Pack buyers** (from 25 Sep 2026): in Supabase, SQL editor:

  ```sql
  -- One row per buyer and currency: someone who paid in both gets two rows.
  select email, currency, sum(amount_total) / 100.0 as paid
  from public.kit_orders
  where status = 'paid'
  group by email, currency
  order by email;
  ```

- **Single-product buyers** (before packs): in the Stripe dashboard, completed
  Checkout Sessions with `metadata.product = production-kit`, unless
  `scripts/kit-backfill.mjs` already copied them into `kit_orders`, in which case
  the query above has them too.

Send one email per person (not one email with everyone in To or CC).

## Decision for Anadi

The plan said "$19 off a rescue". Buyers paid different amounts in dollars or
rupees ($5 to $19 for packs and the kit), so the draft credits **what each
person paid** instead: fair to everyone and easy to honour. For a flat amount,
replace the credit sentence with: "As a thank-you, $19 comes off any rescue you
book with me."

## The email

**Subject:** The Production Kit is free now (and thank you)

> Hi,
>
> You bought the Production Kit from me, so I wanted you to hear this first:
> as of today the kit is a free download for everyone.
>
> Nothing changes for you. Your downloads page and every link in your purchase
> email keep working, and the full kit, every pack, is now yours as well:
> anadithakur.in/products/production-kit
>
> You paid for something that's now free, and I don't think that should cost
> you. What you paid for the kit comes off any rescue you book with me: just
> mention this email when you ask for a quote. If you'd rather have a refund
> instead, reply and say so and I'll send it back.
>
> And if your app is giving you trouble, the audit is still free:
> anadithakur.in/rescue/audit
>
> Thanks for backing it early.
>
> Anadi

## Before sending

- The free kit must be live first, with the new LICENSE (task 15), or the link
  in the email leads to the old buyer license.
- The refund offer is optional. If you keep it, refund from the Stripe
  dashboard. Note what that does here: the webhook removes a buyer's packs on a
  full refund, so their downloads page empties, but the free kit is still
  theirs from the kit page.
