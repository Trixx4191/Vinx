# Vinx

Vinx is a Next.js clothing storefront with customer checkout, provider-hosted
payments, order tracking, and a protected seller/admin console. The current
implementation includes the catalog, authentication, admin tools, 2FA,
S3-compatible image uploads, Paystack, Stripe, and PayPal integrations.

## Stack

- **Next.js 15** (App Router, TypeScript) — one codebase for frontend + API
- **PostgreSQL + Prisma** — relational data, parameterized queries (no raw SQL injection surface)
- **NextAuth (Credentials provider)** — session handling via JWT
- **bcryptjs** — password hashing
- **zod** — request input validation
- **Tailwind CSS** — utility styling, currently unstyled/plain by design

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in a real `DATABASE_URL` (e.g. from Neon or Supabase) and a generated `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
3. `npx prisma migrate dev`
4. `npm run seed` — adds sample categories and one placeholder product
5. `npm run dev` — visit `http://localhost:3000`

## What's built

- Sign up (`/signup`) and log in (`/login`) with hashed passwords, rate-limited signup endpoint
- Product listing (`/products`) and detail page (`/products/[slug]`) with front/back image toggle, size, color, quantity, and live stock status, all driven by the Prisma schema
- API routes: `POST /api/auth/signup`, NextAuth routes, `GET /api/products`, `GET /api/products/[slug]`

## Security decisions and why

- **Passwords**: hashed with bcrypt (cost factor 12), never stored or logged in plaintext.
- **Timing-safe login**: the login check always runs bcrypt.compare, even against a dummy hash when no account exists, so response time can't reveal which emails are registered. The error message is identical either way.
- **Input validation**: every write endpoint validates with zod before touching the database.
- **Rate limiting**: signup is rate-limited by IP. The current implementation is in-memory (`src/lib/rateLimit.ts`) — fine for one server instance, but swap for Upstash Redis before running multiple instances in production.
- **Cookies/sessions**: NextAuth issues httpOnly, sameSite cookies by default, and secure cookies automatically once `NEXTAUTH_URL` is https.
- **Headers**: `next.config.js` sets HSTS, X-Frame-Options, X-Content-Type-Options, and a locked-down Permissions-Policy on every response.
- **Money**: stored as integers in minor units (pesewas/cents) to avoid floating-point rounding bugs in prices and order totals.
- **Secrets**: `.env` is gitignored; `.env.example` documents every variable without real values.

## Admin / seller side

Staff manage the catalog through `/admin` — no code deploys needed to add a
product, edit stock, or restock. This mirrors how Shopify/Amazon Seller
Central work: a back-office UI, not developer intervention.

- `/admin` — dashboard
- `/admin/products` — full catalog table (including unpublished products)
- `/admin/products/new` — create a product with variants
- `/admin/restock` — paste SKU,quantity pairs to bulk-update stock in one submit

**How access is locked down (defense in depth — every layer checked independently):**

1. **No signup path to admin.** `POST /api/auth/signup` always creates `role: CUSTOMER`, with no field a client can set to change that. The only way to create an admin is `npm run create-admin -- email "password" "Name"` — a script run directly against the database, not reachable over HTTP.
2. **Route-level wall.** `src/middleware.ts` blocks `/admin/*` before the page renders for anyone without an `ADMIN`-role session token. A logged-in non-admin who tries to visit `/admin` is redirected straight to `/` — not shown a 403 page, so the admin area's existence isn't confirmed to them.
3. **Page-level re-check.** Every admin page also calls `getServerSession` itself and redirects if the role isn't ADMIN — so even if middleware were ever misconfigured, the page still refuses to render.
4. **API-level re-check.** Every `/api/admin/*` route calls `requireAdmin()` independently and returns a plain 404 (not 403) to an unauthorized caller, again to avoid confirming the route exists.
5. **Audit trail.** Every admin write (create product, restock) is logged to `AdminAuditLog` with who did it, what it was, and when — append-only, never edited or deleted by the app.
6. **No UI leakage.** The "Admin" link in the navbar only renders for admins — regular users never see it, let alone reach it.

Admin 2FA, optional IP allowlisting, and presigned S3-compatible uploads are
implemented. Configure them before production use rather than relying on their
local-development defaults.

## Surviving refreshes

- **Login session**: stored in an httpOnly cookie by NextAuth, so it survives a refresh, a tab close/reopen, and even a browser restart (up to the 30-day session length) — nothing to build here, it's how cookie-based auth works.
- **Cart**: now backed by `src/context/CartContext.tsx`, persisted to `localStorage`. Refreshing, closing the tab, or coming back tomorrow keeps the cart intact. Only cart contents (product, size, color, quantity) live there — never anything sensitive, since anyone with access to the browser can read localStorage.
- **Important consequence**: because the cart lives in the browser, a person could edit its stored price via devtools before checkout. That's expected and handled by never trusting it — the real charge is always recalculated server-side from the database at checkout time (Phase 2/3), using the cart only to know *which* variants and quantities were selected, not what they cost.

## What's visible from the browser / devtools

Assume everything shipped to the client — HTML, JS, CSS, and every API JSON response — can and will be inspected. Nothing sensitive should ever depend on it not being looked at.

- **No secrets in client code**: only `NEXT_PUBLIC_`-prefixed env vars are bundled into client JavaScript by Next.js. Every secret (DB URL, `NEXTAUTH_SECRET`, Stripe/Paystack secret keys, PayPal secret) is deliberately unprefixed, so it never leaves the server. `.env.example` documents which is which — get this prefix wrong for a secret key and it becomes visible in the page source to everyone.
- **No stack traces or DB errors returned to the client**: `src/lib/safeErrors.ts` wraps every write endpoint. A thrown error is logged in full server-side but the client only ever sees a generic message — never a Prisma error string (which can reveal table/column names) or a stack trace.
- **No over-fetching in API responses**: every query explicitly `select`s only the fields a response needs. `passwordHash` is never selected outside `src/lib/auth.ts`'s own login check, so it can never accidentally end up in a JSON response, even by future-refactor accident.
- **No draft/unpublished data leaking to customers**: `/api/products` and `/api/products/[slug]` always filter `isPublished: true`. Only `/api/admin/products` returns unpublished items, and that route is admin-gated.
- **Framework fingerprinting reduced**: `poweredByHeader: false` removes the `X-Powered-By: Next.js` header; `productionBrowserSourceMaps: false` stops shipping a map back to original source code in production builds.
- **Security headers on every response** (`next.config.js`): HSTS, X-Frame-Options (blocks clickjacking iframes), X-Content-Type-Options, a locked-down Permissions-Policy, and a baseline Content-Security-Policy.
- **CSRF**: NextAuth's own routes carry built-in CSRF tokens. Custom API routes rely on the session cookie's `SameSite=Lax` setting (NextAuth's default), which browsers exclude from cross-site POST requests — a real cross-site form/fetch can't ride along with a logged-in session.
- **robots.txt** keeps `/admin`, `/account`, `/checkout`, and `/api` out of search engine indexes — not a security control by itself, but no reason to make those paths easy to stumble on.

## Routing

- Customer routes: `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, `/signup`
- Admin routes: `/admin`, `/admin/products`, `/admin/products/new`, `/admin/restock` — all gated per the admin security model above
- API routes mirror the same shape under `/api/*`, with `/api/admin/*` carrying its own independent auth check

## Charge integrity — the price the client sees is never the price that's charged

`POST /api/checkout` is the only way an order gets created, and its request
schema (`checkoutSchema` in `src/lib/validation.ts`) makes it structurally
impossible to send a price: the client can only send `variantId` and
`quantity` per item, plus a shipping address. There is no `price` or `total`
field anywhere in that schema — not "ignored if sent," genuinely not present,
so there's nothing there for devtools to tamper with.

Inside `src/app/api/checkout/route.ts`, everything money-related is derived
fresh, inside a single database transaction:

- **Price**: read from `variant.product.price` in the same transaction — never from the cart, never from the request body.
- **Stock**: checked and decremented atomically (`updateMany` with `quantity: { gte: requested }`) inside that transaction, so two people racing to buy the last item can't both succeed — whoever's write lands first wins, the second gets a 409 "not enough stock."
- **Total**: summed server-side from those authoritative per-item prices.
- **Ownership**: `getServerSession` is checked independently in the route itself, not just relied on via middleware — the same defense-in-depth pattern used for admin routes.
- **Order retrieval** (`/orders/[id]`) checks that the requester is either the order's owner or an admin before showing anything — a customer can't view someone else's order by guessing an ID.

The cart's displayed price (`CartContext`) is purely a UI convenience so
people can see roughly what they'll pay before checking out — it is never
read by the server for anything that affects a charge.

## Payments

**Paystack** (cards + MTN MoMo + Telecel Cash + AirtelTigo Money), **Stripe**
(international cards), and **PayPal** are wired. Provider credentials and
webhook endpoints must be configured in the relevant dashboards.

**Flow**: checkout creates a `PENDING` order → order page shows "Pay now" →
that calls `/api/payments/{provider}/initialize` (or `create-session` for
Stripe), which only ever takes an `orderId` → provider hosts the actual
payment page (card entry, MoMo prompt, etc. — none of that ever touches our
server) → user is redirected back → we independently re-verify with the
provider before marking anything paid.

**The rule that matters most here**: an order is marked `PAID` in exactly one
place — `src/lib/payments/markOrderPaid.ts` — and it is only ever called
after a **server-to-server** call to the provider confirms success, never
because the client said so:

- **Paystack**: both the callback (`/api/payments/paystack/callback`, where the browser lands after paying) and the webhook (`/api/payments/paystack/webhook`, called directly by Paystack) independently call Paystack's own `verify/:reference` endpoint before trusting anything. The webhook additionally requires a valid `x-paystack-signature` (HMAC-SHA512 over the raw request body, compared with a timing-safe check) before it even looks at the payload.
- **Stripe**: the webhook uses Stripe's SDK (`stripe.webhooks.constructEvent`) to verify the signature — this is the only way Stripe payloads are ever trusted, and only `checkout.session.completed` with `payment_status: "paid"` triggers anything.
- **Amount re-check**: `markOrderPaid` refuses to mark an order paid if the provider-confirmed amount/currency doesn't match what's stored on the order — even a correctly-signed webhook can't pay off an order for the wrong amount.
- **Idempotent**: safe to call twice (webhook retries, plus a user landing on the callback URL after the webhook already fired) — an already-`PAID` order is a no-op.

Set up in your provider dashboards once you have real keys:
- Paystack: webhook URL → `https://yourdomain.com/api/payments/paystack/webhook`
- Stripe: webhook URL → `https://yourdomain.com/api/payments/stripe/webhook`, subscribed to `checkout.session.completed`

## Order tracking

`Order` now carries `carrier`, `trackingNumber`, `trackingUrl`, and `estimatedDelivery`.
A separate `OrderStatusEvent` table logs every status change with a timestamp,
so a customer's order page in Phase 2/3 can render a full timeline (Placed →
Paid → Shipped → Delivered) rather than just the current state.

## Accounts required to checkout

`src/middleware.ts` blocks `/checkout/*` and `/account/*` for anyone without a
session and redirects to `/login` — no guest checkout. This runs before the
page loads, so there's no path where checkout is reachable unauthenticated.

## Admin order management (Phase 5)

- `/admin/orders` — full order list, filterable by status
- `/admin/orders/[id]` — order detail: items, customer, shipping address, payment reference, full status history, and a form to update status/carrier/tracking number/tracking URL

Same defense-in-depth as the rest of `/admin`: page and API route both
re-check the session independently, every update is written to
`AdminAuditLog`, and — importantly — **admins can change status and tracking
but the update endpoint has no path to touch price, items, or payment
fields**. A compromised or careless admin account can mark an order shipped
or cancelled, but it can't rewrite what was charged or what was ordered;
those stay locked to whatever checkout and payment verification originally
set.

## The smaller items, now done

**PayPal** — same pattern as Paystack/Stripe: `/api/payments/paypal/create-order` takes only an `orderId`, creates the PayPal order server-side using the database amount, and redirects to PayPal's approval page. `/api/payments/paypal/callback` captures server-to-server and only calls `markOrderPaid` after PayPal confirms `COMPLETED` status and the captured amount matches.

**Admin 2FA (TOTP)** — enforced specifically for admin accounts, since that's the highest-value target:
- `/admin/security` lets an admin scan a QR code (via `otplib` + `qrcode`) and confirm a code before 2FA actually turns on — so a botched scan can't lock the account out.
- Once enabled, `src/lib/auth.ts`'s login check requires a valid 6-digit code in addition to the password. The login page reveals a second field only after the password already checked out, rather than asking for it upfront (keeps normal customer login unchanged).
- Disabling 2FA requires a currently-valid code too — a hijacked session alone can't strip the account's protection.
- Every enable/disable is logged to `AdminAuditLog`.

**Real image upload** — `src/lib/storage.ts` generates presigned S3-compatible upload URLs (works with AWS S3, Cloudflare R2, DigitalOcean Spaces — set `S3_ENDPOINT` for the latter two). The admin product form now has real file inputs: the browser gets a presigned URL from `/api/admin/uploads/presign` (admin-gated) and PUTs the file straight to storage — image bytes never pass through our server. The storage key is always server-generated (`products/<uuid>.<ext>`), never taken from the client's filename, so there's no path-traversal or overwrite risk.

**Admin IP allowlist** — optional, off by default. Set `ADMIN_IP_ALLOWLIST` (comma-separated IPs) once you have a static office/VPN IP, and `/admin` becomes unreachable from anywhere else — checked in `src/middleware.ts` before login/role even come into play.

## Operational notes

- Pending orders reserve stock for 30 minutes. Requests opportunistically
  release expired reservations and return the quantities to inventory. A
  scheduled request to a checkout or payment endpoint is recommended for
  timely cleanup even during quiet periods.
- Rate limiting uses Upstash Redis when `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` are configured. Without those variables it falls
  back to an in-memory limiter suitable only for a single server instance.
- The repository currently has no automated test files. `npm run build` is the
  primary type-check and production validation command.

## Environment variables

Required: `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.

Payment configuration:
`PAYSTACK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and optionally `PAYPAL_API_BASE`.

Storage configuration:
`S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`S3_BUCKET`, and `S3_PUBLIC_URL_BASE`.

Optional hardening:
`ADMIN_IP_ALLOWLIST`, `UPSTASH_REDIS_REST_URL`, and
`UPSTASH_REDIS_REST_TOKEN`.
