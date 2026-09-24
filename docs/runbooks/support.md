# Support runbooks

## Webhook replay

1. Admin → Webhooks → filter `failed`.
2. Open the event: read the error. Common causes: an unmapped LS variant (fix the ids in Sanity,
   run `pnpm ls:sync` or Admin → Products → Sync), a Clerk outage, a database timeout.
3. Fix the cause, then **Replay**. Handlers are idempotent, so replaying a processed event is safe.
4. Bulk outage (many failures): call the reconciliation cron manually:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://lumira.dev/api/cron/reconcile`.

## "I didn't receive my email"

1. Admin → ⌘K → customer email → timeline, find the `email_*` event.
2. `bounced` / `complained`: the customer is flagged; ask for a working address, change it in Clerk
   (the Clerk webhook updates Postgres), then **Resend** from the timeline.
3. `failed`: check Admin → Integrations → Resend (domain verified?) and the email log error.
4. `sent` / `delivered`: ask the buyer to check spam, then **Resend** (a new idempotency key is
   used, so it really sends again). The Library link in the email is single-use; they can always
   sign in with their email code instead.

## Activation limit reached

1. Customer timeline → License keys → the key's activations.
2. Prefer deactivating a stale instance (the buyer can also do this in Account → Licenses).
3. Otherwise **Change activation limit** (reason required; step-up verification; audited). The
   change is made in Lemon Squeezy first, then mirrored.

## Refund with revocation

1. Refund in Lemon Squeezy (full refund).
2. Admin → Webhooks: `order_refunded` processed.
3. Customer timeline: entitlement revoked, key `disabled` (job `license_key_disable`), Discord
   role removed (job `discord_revoke`), refund email sent. Email download links stop working.
4. Partial refunds change the order status only; access remains.
