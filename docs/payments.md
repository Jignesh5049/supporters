# Premium and payments

Supporters Premium is ₹999 a year per business, GST-inclusive, auto-renewing through Razorpay Subscriptions. It is sold on the web only. Specs: product spec ("Premium subscription"), backend spec ("Payments and money", endpoint map "Premium" and "Webhooks", the `payments` queue).

Everything is built against a `PaymentsProvider` interface (`apps/api/src/modules/payments/provider.ts`). `FakeRazorpay` stands in for tests and local development; `RazorpayProvider` is a thin adapter over the official `razorpay` SDK that works in Razorpay test mode. The client's Razorpay account (KYC) does not exist yet, so the adapter has **never run against Razorpay**: its response shapes follow the docs and must be checked once with `rzp_test_` keys.

## Configuration

| Variable                                                                       | Meaning                                                                                                                                         |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PAYMENTS_PROVIDER`                                                            | `none` (default; Premium endpoints answer 503 `PAYMENTS_NOT_CONFIGURED`), `fake` (dev and tests; refused in staging and production), `razorpay` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                                       | API keys. `rzp_live_` keys are accepted in production only                                                                                      |
| `RAZORPAY_WEBHOOK_SECRET`                                                      | The secret set on the webhook in the dashboard (16+ characters)                                                                                 |
| `RAZORPAY_PLAN_ID`                                                             | The yearly plan, 99900 paise, created in the dashboard                                                                                          |
| `WEBHOOK_MAX_AGE_SEC`                                                          | Oldest event accepted by its own timestamp. Default 25 h (Razorpay retries for 24 h)                                                            |
| `INVOICE_SELLER_NAME`, `_GSTIN`, `_ADDRESS`, `_STATE_CODE`, `INVOICE_SAC_CODE` | Printed on invoices. Required in production with Razorpay                                                                                       |

Keys live in SSM Parameter Store (never in the repo). Set them on both the API and the worker.

## How a purchase flows

1. `POST /v1/me/business/premium/checkout` (web only, `Idempotency-Key`) creates a Razorpay Subscription and returns the ids Checkout needs. Nothing is Premium yet.
2. The buyer pays in Razorpay Checkout. The browser callback is **never trusted**.
3. Razorpay calls `POST /v1/webhooks/razorpay`. The route verifies the HMAC-SHA256 of the **raw body**, the event id header and the event age, stores the event in `webhook_events` (unique provider event id) with an outbox row, and answers 200. A replay is acknowledged and does nothing.
4. The worker's `payments` queue (10 attempts, exponential backoff, then `dead-letter`) applies the event: payment recorded once, subscription period set, `businesses.premium_until` moved, invoice numbered, `premium.activated` or `premium.renewed` queued.
5. The web page polls `GET /v1/me/business/premium` until it shows `active`.

`businesses.premium_until` stays the single perk gate. Search boost, Discover "Featured", listing and post limits and requirement matching all read it, so they flip together. The payments module only moves that date (and queues a search sync when it moves).

## Lifecycle

| Event                              | Result                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription.charged` (first)     | `active`, `premium_until` = period end, `premium.activated`, invoice, held listings republished                                             |
| `subscription.charged` (renewal)   | period moves forward, `premium.renewed`, invoice                                                                                            |
| `payment.failed` on a renewal      | `past_due`, grace of 7 days from the failure; `premium_until` = end of grace; `premium.payment_failed` once                                 |
| `subscription.halted`              | same as a failure if no grace has started                                                                                                   |
| `subscription.cancelled`           | auto-renew off; Premium runs to the end of the paid period                                                                                  |
| `refund.processed` (first payment) | payment `refunded`, subscription ended, perks off at once, `premium.refunded`                                                               |
| hourly cron                        | ends subscriptions past their period (cancelled) or grace, and unpaid checkouts older than 7 days; unpublishes listings over the free limit |
| daily cron (10:00 IST)             | `premium.renewing` 7 days before renewal, once per period, only while auto-renew is on                                                      |

Ordering is tolerated: a failure older than a charge already applied is ignored, a charge older than the failure that started the grace does not end it, the period never moves backwards, and a refund that arrives before its charge fails and is retried by the queue.

After expiry nothing is deleted. Listings over the free limit (25) are unpublished, keeping the newest 25, and remembered in `premium_listing_holds`. The owner chooses with `GET`/`PUT /v1/me/business/premium/listings` (`{ keep: [{ kind, id }] }`, at most 25). Buying Premium again republishes held listings.

## Domain events other modules can use

Written to `outbox_events` in the same transaction as the change (`recordEvent`). The notification fan-out accepts them and notifies nobody; a consumer adds a `case` to `NotificationFanout.resolve` or reads the rows.

`premium.activated` is for referrals. It fires once per subscription, on the first captured payment, never on renewals:

```json
{
  "businessId": "uuid",
  "userId": "uuid (the business owner)",
  "paymentId": "uuid (payments.id, not Razorpay's id)",
  "amountPaise": 99900,
  "currency": "INR",
  "occurredAt": "ISO 8601, when the payment was captured"
}
```

`premium.refunded` has the same shape and fires when that first payment is refunded (the referral becomes ineligible). Types are `PremiumActivatedEvent` and `PremiumRefundedEvent` in `packages/shared` (`schemas/premium.ts`). Owner notifications: `premium.renewing`, `premium.renewed`, `premium.payment_failed`, `premium.expired` (`{ subscriptionId }`, category `subscription`).

## Invoices

`SUP/<financial year>/<6 digits>`, for example `SUP/2026-27/000123`. The counter is `invoice_sequences`, bumped under its row lock inside the transaction that issues the invoice, so numbers are unique and gapless (a rolled-back payment gives its number back). The financial year runs April to March by the date in IST. The PDF is rendered by the worker (`payments.invoice` outbox event, queue job `invoice-pdf`) and stored at `invoices/<businessId>/<invoiceId>.pdf` in the private bucket. `GET /v1/me/business/invoices/:id` returns a 5-minute signed link once it is ready.

## Assumptions that need the client, their accountant or a Razorpay account

Needs the **accountant**:

1. **SAC code and GST rate.** `998439` is a placeholder and 18% is assumed (`SAC_CODE_PLACEHOLDER` in `gst.ts`, `PREMIUM.gstRatePercent`). Override the code with `INVOICE_SAC_CODE`.
2. **Supplier details** (legal name, GSTIN, address, state code) are env values; invoices say "not configured" until set.
3. **Place of supply.** The buyer state is the first two digits of the buyer GSTIN (the one given at checkout, else the business GSTIN), else the business's state (mapped from ISO code to GST code in `gst.ts`). Same state as the supplier: CGST + SGST; otherwise IGST. Confirm the rule for unregistered buyers.
4. **Rounding.** Taxable value is `round(total / 1.18)`, tax is the remainder (₹999.00 = 846.61 + 152.39); CGST takes the lower half, SGST the odd paisa.
5. **Credit notes.** A refund does not create a GST credit note yet.
6. **Invoice by email.** The product spec says the invoice is emailed. Only the in-app list and signed download exist; emailing a PDF needs SES raw email with an attachment, or a link email.
7. **Non-Latin names.** The built-in PDF writer uses Helvetica (WinAnsi): other scripts print as `?`, and the rupee sign is written "INR". Embedding a Unicode font is a follow-up.

Needs the **client**:

8. **Refund policy** (decision 11 is "needs client input"): built as a full refund within 7 days of the first purchase, admin-initiated, renewals not refunded.
9. **Perks** (decision 6 is proposed): badge, featured placement, search boost, unlimited listings and posts, analytics history, matching priority. Analytics history length is not built (`PLAN_LIMITS.premium.analyticsDays` exists).
10. **Grace** is counted from the first failed renewal payment, not from the period end. A cancelled subscription gets no grace. A business that fixes its payment method inside the grace is charged by Razorpay's own retry; there is no in-app "update payment method" yet.
11. **Renewal lag.** An auto-renewing subscription whose period ended is given 3 days for the charge webhook before it is ended (UPI AutoPay debits can lag), but `premium_until` is the period end, so perks are off meanwhile. Say if you want a buffer on `premium_until` instead.

Needs a **Razorpay account** (test mode is enough for 12 to 15):

12. Create the yearly plan (99900 paise), set `RAZORPAY_PLAN_ID`, register `POST /v1/webhooks/razorpay` with the five events, and set the webhook secret.
13. Confirm the `payment.failed` payload names its subscription. The handler reads `payment.entity.subscription_id` or `notes.subscription_id`, then falls back to a server-side fetch (payment, its invoice, the invoice's subscription). The fallback is untested against the real API.
14. Confirm the fields the adapter reads: `current_start` and `current_end` on `subscription.charged`, and that `notes` on the Subscription are echoed.
15. Confirm webhook retries last 24 h (`WEBHOOK_MAX_AGE_SEC` is 25 h) and that Razorpay's IPs are allowed through the load balancer.
16. Confirm Razorpay Checkout's current CSP hosts before launch (see the web PR). Subscription `total_count` is 10 yearly cycles.
