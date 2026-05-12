# noema-ai
# missnoema
# missnoema

## Payments (Stripe replacement)

Set `PAYMENT_PROVIDER=external_links` (default) to stop using Stripe checkout routes.

Configure hosted checkout links:

- `PAYMENT_LINK_PLAN_PREMIUM`
- `PAYMENT_LINK_PLAN_PREMIUM_PLUS`
- `PAYMENT_LINK_COINS_500`
- `PAYMENT_LINK_COINS_1200`
- `PAYMENT_LINK_COINS_2500`

Optional URL param names for providers:

- `PAYMENT_USER_ID_PARAM` (default: `memberID`)
- `PAYMENT_EMAIL_PARAM` (default: `x-billemail`)
- `PAYMENT_PURCHASE_PARAM` (default: `purchase`)
- `PAYMENT_TYPE_PARAM` (default: `purchaseType`)
- `PAYMENT_SUCCESS_URL_PARAM` (if provider supports success redirects)
- `PAYMENT_CANCEL_URL_PARAM` (if provider supports cancel redirects)
- `PAYMENT_LINK_SIGNING_SECRET` (adds `app_sig`)

Webhook endpoint for external processors:

- `POST /api/payments/webhook`
- Optional shared secret: `PAYMENT_WEBHOOK_SECRET` and send `x-payment-webhook-secret` (or `secret` body field).
- Supports JSON and form-urlencoded payloads.
- Returns `GOOD` for Segpay-style postbacks.
