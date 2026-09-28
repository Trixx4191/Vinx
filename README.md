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
- `/admin/models` — the shoot roster, for on-model photography
- `/admin/restock` — paste SKU,quantity pairs to bulk-update stock in one submit

### Roles

| Role | Can do |
| --- | --- |
| `CUSTOMER` | Shop, check out, view their own orders. The only role signup can create. |
| `ADMIN` | Everything in `/admin`: catalog, inventory, orders, activity. |
| `SUPER_ADMIN` | All of the above, plus `/admin/staff` — granting and revoking admin access. |

Create the first master admin from the CLI, since no admin exists yet to
authorise one:

```
npm run create-admin -- --super you@example.com "a-strong-password" "Your Name"
```

Re-running it against an existing account resets that account's password and
role, which is also the recovery path if the master admin is ever locked out.
A password passed as an argument lands in shell history and is briefly visible
to `ps`; pass `ADMIN_PASSWORD='…'` as an environment variable instead to avoid
both.

Every role check goes through `isAdminRole` / `isSuperAdminRole` in
`src/lib/roles.ts` rather than comparing against the string `"ADMIN"`. That
matters more than it looks: the literal comparison was previously written out
by hand in thirteen places, and each one would have silently excluded
`SUPER_ADMIN` the moment the role was added — including the 2FA gate in
`src/lib/auth.ts`, where excluding it would have let the most privileged
account in the system sign in on a password alone despite having 2FA enabled.

**Revoking an admin does not delete the account.** It sets the role back to
`CUSTOMER`. Their orders and their rows in `AdminAuditLog` both reference the
user, and that log is append-only by design — deleting the account would either
fail on those foreign keys or erase the history the log exists to preserve.
Revoking removes every privilege while keeping the record of what the account
did.

Two lockout guards sit on role changes, enforced in the API rather than only in
the UI: you cannot change your own role, and the last remaining `SUPER_ADMIN`
cannot be demoted or revoked. The second runs inside a `Serializable`
transaction, because it is a read-then-write — two masters demoting each other
at the same instant would otherwise both read a count of two, both succeed, and
leave the system with no master admin at all.

**How access is locked down (defense in depth — every layer checked independently):**

1. **No signup path to admin.** `POST /api/auth/signup` always creates `role: CUSTOMER`, with no field a client can set to change that. The first admin can only be created by `npm run create-admin` — a script run directly against the database, not reachable over HTTP. After that, a `SUPER_ADMIN` can add staff from `/admin/staff`, which is itself gated on `requireSuperAdmin`, so a regular `ADMIN` can never promote themselves.
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

## Design system and product media

The storefront uses a small set of shared primitives in
`src/components/luxury/` — `Button`, `Heading`, `Kicker`, `SectionHeader`,
`Badge`, `Price`, `Section`, `ProductGrid`, `ImageGallery`, form fields and
skeletons. They are presentation-only and carry no product knowledge; the
product tile itself lives in `src/components/ProductCard.tsx` so there is
exactly one definition of what a product looks like in a grid.

### The look, and where it is defined

Everything the design is made of is a token in `src/app/globals.css` or the
`soft` ramp in `tailwind.config.ts`. No component hard-codes a colour, a
tracking or a section gap.

- **Ground.** Bone (`#faf8f6`), not white, and warm all the way down the ramp
  rather than only at the pale end. The reference storefronts shoot on sand and
  sit on sand because a warm ground flatters skin and knitwear; on a cold grey
  both look grey too, and this catalog is mostly both. The product stage
  (`--product-ground`) is one step darker, so a tile reads as an object on the
  page rather than a hole in it.
- **No surfaces.** Storefront content sits directly on the ground, separated by
  space and the occasional hairline. There are no cards, borders-around-groups
  or drop shadows — those are what make a fashion site look like a dashboard.
  `.glass` survives for the **admin**, which is a genuinely different problem: a
  dense back-office benefits from panels that group its fields.
- **One typeface.** Archivo, one variable file, latin subset. It replaced Inter,
  which is an excellent interface face and therefore reads as software. The
  whole type system is two treatments of it: `type-d1/d2/d3` pull tracking in at
  display sizes, `type-micro` pushes it out for labels, nav and buttons. A
  display/text pairing was rejected on page weight — a second family is a second
  download for every shopper, and plenty of this audience is on mobile data.
- **Fluid display steps.** `--display-1/2/3` are `clamp()`, not
  `text-4xl sm:text-6xl` stacks. A breakpoint pair jumps: at 639px a title is one
  size and at 641px it is a third bigger, and every width in between gets
  whichever of the two fits worst.
- **One rhythm.** `--section-gap` is the space between every major section, as
  the `.section-gap` utility. Airiness is most of what separates a storefront
  that looks considered from one that looks cramped, and it only reads as
  intentional when it is consistent.
- **Underline fields, not boxes.** A page of boxed inputs is the single thing
  that most makes a storefront look like admin software.

Two constraints that are easy to break by accident:

- **The Tailwind `spacing` and `fontSize` scales are never redefined.**
  Overriding a key like `4` or `sm` in `theme.extend` silently rewrites every
  existing `p-4` and `text-sm` across the app at once. This has bitten once
  already, doubling every padding in the app.
- **Keyframes are declared in `globals.css`, not in the Tailwind config.**
  Tailwind only emits a `@keyframes` block when the matching `animate-*` utility
  appears in the scanned source. `slideUp` was declared in the config and used
  only by `.page-enter` in CSS, so it was never emitted and every page's entry
  animation silently did nothing.

### The admin

Same brand, different problem. The storefront is surface-less because content
there is meant to be looked at; the admin is a dense back-office where someone
is scanning, comparing and typing, and grouping fields into panels is what makes
that legible. So panels stay — flat, square, hairline, in the same warm neutrals
and the same typeface, so it reads as one product rather than two.

`.admin-panel` and `.admin-panel-link` replaced `glass rounded-2xl` /
`glass rounded-3xl`, which appeared at twenty call sites. The radius in those was
already a no-op: a blanket `.rounded-* { border-radius: 0 !important }` rule at
the bottom of `globals.css` flattened every one of them, so the markup described
a rounded panel the screen never drew, and anyone writing `rounded-2xl`
afterwards was silently overruled. Both the classes and the override are gone,
along with the radius scale in the Tailwind config — the system is square because
nothing asks for a radius, not because a rule is quietly cancelling every
request. `.glass`, `.glass-strong`, `.hero-glass` and `.card-soft` went with
them: leftovers from an iOS-glass iteration, three of which had no callers at
all.

`.admin-panel-link` has no hover lift. A card that rises under the cursor is the
dashboard gesture this system spent the storefront removing.

### Heading level vs heading size

`Heading` takes `level` (the semantic tag) and an optional `size` (the visual
step). They are separate because a product page's title has to be the `h1` for
the document outline and for search results, while display-1 is a
full-viewport-width collection headline that would dwarf the product beside it.

Before this existed, the only way to get the right size was `level={2}` — and
the storefront had picked that up on **every page**. The catalog, bag, checkout,
account, order and product pages all rendered their title as an `h2` and had no
top-level heading at all. That reads as a purely visual choice in a diff, which
is exactly why it spread.

`Product` carries two optional media fields beyond `frontImageUrl` /
`backImageUrl`:

- `hoverVideoUrl` — a short muted MP4. On a product tile it plays on hover; on
  the detail page it appears as the last gallery slot. The `<video>` element is
  only mounted after a tile is first hovered, so a 20-product grid does not
  start twenty downloads on page load, and `preload="none"` keeps even the
  mounted element from fetching until playback starts. Touch devices never fire
  hover and simply keep the still image.
- `galleryImages` — up to eight extra detail shots, capped in both the Zod
  schema and the admin form so the two can't disagree.

`productMedia()` in `src/types/product.ts` builds the ordered media list from
those fields, and both the tile and the detail gallery read from it, so they
cannot drift apart on what counts as a product's media.

Staff set both from `/admin/products/[id]` — no deploy needed. Uploads go
through the same presigned-URL path as images; `src/lib/storage.ts` allows
`video/mp4` alongside the image types and derives the storage key's extension
from the validated content type rather than the client's filename, so a stored
object's extension can never disagree with the `Content-Type` it is served
under. Note that a presigned PUT cannot cap its own body size — the browser-side
size check is a convenience, and a bucket policy is what actually bounds it.

### Where the images and videos come from

You supply them. Nothing in the storefront pulls product media from a stock or
free image service at runtime — every image and video is uploaded by you and
served from your own bucket.

The only exceptions are the seed placeholders (`placehold.co`, plus one public
sample clip), which exist so the catalog renders before you have real assets.
They are demo data: overwritten the moment you edit a product in `/admin`, and
`placehold.co` is only allowed as an image host in development.

To add real media, set the `S3_*` variables in `.env` (see `.env.example`),
then upload from `/admin/products/new` or `/admin/products/[id]`. Files go
straight from your browser to your bucket without passing through the server.

**Before you have a bucket**, uploads fall back to writing into
`public/uploads` on your own machine, so the catalog can be filled in and
reviewed locally. Three conditions must all hold for that path to accept a
byte: the caller is an admin, `NODE_ENV` is `development`, and no real bucket
is configured. It returns 404 otherwise — in production it must not exist,
since writing into the deployment directory does not survive a redeploy and
fails outright on the read-only filesystems most hosts use. `public/uploads`
is gitignored; move to a bucket before deploying.

Note that presigning an S3 upload is pure local cryptography and never
contacts S3, so a wrong bucket or endpoint produces a valid-looking signature
and fails only later, in the browser. `isS3Configured()` therefore checks for
the `.env.example` placeholder values too, rather than merely for a non-empty
string.

Rough specs:

| Slot | Format | Size | Notes |
| --- | --- | --- | --- |
| Front / back image | JPEG, PNG or WebP | ~1200–2000px wide, under 8MB | Required. 3:4 portrait matches the tile. |
| Detail shots | same | same | Up to 8 per product. |
| Model shot | same | same | Up to 5 per product, one per model. You produce these outside Vinx — see [Model view](#model-view). |
| Model portrait | same | smaller is fine | Optional. Identifies the model in the admin picker. |
| Hover video | MP4 (H.264) | 3–8s, under 25MB | Muted — it plays with no sound and no controls. |

The browser-side size check is a convenience only; a presigned PUT cannot cap
its own body size, so set a bucket-level limit before production.

One header change was required for any of this to work: `next.config.js` now
sets an explicit `media-src` in the CSP. Under the previous policy
`default-src 'self'` silently blocked videos served from S3/R2 — the `<video>`
simply never painted, with no error anywhere.

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
- `npm test` runs the unit suite (see **Tests**); `npm run build` is the
  primary type-check and production validation command.

## Transactional email

Order confirmations go out when payment is verified; a shipping notice goes out
the first time an admin moves an order to `SHIPPED`. Configure SMTP in `.env`
(see `.env.example`). With it unset the shop still takes orders — it logs each
message it would have sent and carries on.

The rule that shapes this code: **sending email must never break the thing that
triggered it.** An order is marked paid only after a provider confirms the money
moved. If the receipt then fails to send, the payment has still happened and the
order must still be paid — throwing there would turn a settled transaction into
an error response and make the provider retry its webhook against an order that
is already complete. So every function in `src/lib/email/` resolves; failures are
logged and returned, never raised.

Templates are pure functions in `src/lib/email/templates.ts`, which is what makes
them testable. All interpolated values are HTML-escaped: product names, colours
and addresses are free text someone typed, and a name containing markup would
otherwise land in a customer's inbox.

The shipping notice fires only on the *transition* into shipped, so correcting a
typo in a tracking number does not send a second "on its way" email.

## Scheduled stock release

Checkout reserves stock for 30 minutes so two people cannot buy the last item
while one is still on a payment page. Releasing it used to be opportunistic —
it happened when some other request touched checkout — so a quiet night left
stock locked behind orders nobody was going to pay for.

`GET|POST /api/cron/release-stock` gives a scheduler something to call:

```
curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/release-stock
```

Every five to fifteen minutes is reasonable. The endpoint is **disabled while
`CRON_SECRET` is unset** — a route that mutates inventory fails closed rather
than being open because a variable was forgotten — and the secret is compared in
constant time. An unauthorised caller gets a 404, matching `/api/admin/*`, so it
learns nothing about whether the path exists.

It reports how many orders it actually released, which is not the same as how
many it found: the scheduled job and an opportunistic call can race, and only
one wins the claim on each order.

## Account self-service

`/account` lets a customer change their password and edit their delivery
address.

Changing a password requires the current one, checked server-side. Possession of
a live session is deliberately not enough — otherwise an unattended browser or a
stolen cookie becomes permanent account takeover.

Editing an address **never rewrites a row an order points at**. `Order.addressId`
references a specific address, and an order is a record of where something was
actually sent; editing that row in place would silently change the shipping
address on past, possibly delivered, orders. So an address already used by an
order is left untouched and a new default is created beside it.

Note that changing a password does not sign other devices out. NextAuth's JWT
does not carry the password hash, so it is not invalidated by the change — doing
that properly needs a token version on the user record.

## Catalog search and pagination

Filtering, sorting and paging happen in the database, 24 products to a page.
Previously the page loaded every published product and filtered in the browser,
which meant a visitor downloaded the whole catalog to look at one category.

All state lives in the URL, so a filtered view is shareable, survives a refresh,
and works with the back button. `src/lib/productQuery.ts` translates params into
a query and is a pure function, so the parsing is tested without a database.

Two details worth keeping: every sort ends with a unique tiebreak on `id`,
because two products at the same price otherwise have no defined order and the
database may return one on page 1 and again on page 2 while dropping another;
and the search term is length-capped before it reaches a `LIKE`.

## Colourway swatches

The product grid shows a dot per colourway. Each dot's colour comes from one of
two places, in order:

1. **`ProductVariant.colorHex`** — set from the colour picker beside each
   variant row in `/admin/products`. This is the actual garment colour.
2. **A name match** — `src/lib/swatch.ts` matches the free-text `color` against
   a table of about fifty garment colours, handling compound names so
   "Light Heather Grey" finds heather grey rather than plain grey. This is a
   guess, and it is why the column exists.

An unmapped name still renders, as a muted tone derived deterministically from
the name, so adding a colour can never produce a missing or invisible dot. Pale
swatches get an outline: measured from relative luminance for stored hex values,
matched against a word list for guessed ones.

`colorHex` is validated as `#rrggbb`, with shorthand expanded and the value
lower-cased so only one shape is ever stored. The pattern is strict because this
value is interpolated into a `style` attribute on the storefront — nothing but a
colour can be put in it.

The column is nullable and the fallback is permanent, so variants created before
it keep working untouched. Setting a colour is an improvement, not a migration
you have to finish.

## Site facts live in one file

`src/content/site.ts` holds everything on the storefront that is a fact about
the business rather than a piece of design: the contact address, the delivery
zones and times, the free-delivery threshold, the returns window, the payment
methods.

**Every value in it is a placeholder and needs your real one.** Several are
commitments to a customer — a returns window and a delivery estimate are terms
you are agreeing to when someone buys — so they are deliberately not scattered
through the markup where you would have had to hunt for them. They appear in the
footer, the customer-service pages, the product page's delivery note and the
homepage service band, and changing them here changes all of those at once.

The customer-service pages (`/delivery`, `/returns`, `/size-guide`, `/contact`,
`/about`) exist so the footer does not link to 404s. A shopper who taps
"Returns" and lands on a missing page trusts the checkout less, not just the
footer.

## Model view

A product can show a photograph of a model wearing it. On the detail page that
shot leads the gallery, captioned with who is wearing the piece, their height and
the size they have on — "On Kofi · 185cm · wearing L". That caption is the whole
reason a model is a database record rather than just another image URL: it tells
a shopper more about fit than a size chart does, and it is the one thing the
photograph cannot say for itself.

**Vinx does not generate these images.** There is no model API, no key, no
per-image cost and no generation pipeline anywhere in the codebase. You produce
the image however you like, outside the application, and upload it in the admin
product form through exactly the same presigned-upload path as the front and back
shots. To the app it is simply another image on the product.

Two tables:

- **`Model`** — the three-to-five people the catalog is shot on: name, gender,
  optional height and size worn, an optional reference portrait, an ordering, and
  an `isActive` flag. A small registry rather than a free-text field per product,
  because the point of a fixed roster is that the same faces recur, which is what
  makes a catalog read as one brand. A typed-per-product name would be "Kofi",
  "kofi" and "Kofi B." inside a week.
- **`ProductModelShot`** — one uploaded image per (product, model) pair, unique
  on that pair. A second angle on the same model belongs in the product's gallery
  images; a duplicate pairing would make "which model is this shown on"
  ambiguous.

How it behaves:

- **Adding a model view is per-product and optional.** There is no separate
  toggle — a product has a model view if it has model shots, so there is nothing
  that can fall out of sync with the imagery. Up to five shots per product.
- **Models are retired, not deleted.** `isActive: false` removes a model from the
  product-form picker while leaving every existing photograph intact. A delete is
  refused with a 409 naming the count while shots still reference them, and the
  foreign key is `RESTRICT` so the database refuses it too. That is deliberate:
  cascading would strip imagery from every product they appear in, and nulling
  would leave photographs of a person the catalog can no longer name.
- **Retired models are still accepted on save.** `isActive` governs what is
  offered for new shoots, not whether an existing product may keep its imagery.
  Rejecting them would mean retiring a model silently broke every subsequent save
  of every product they appear in.
- **Ordering is server-side.** `sortOrder` is assigned from the submitted
  sequence, not taken from the client, so the arrangement an admin made in the
  form is the one a shopper sees.
- **Model shots are loaded only on the detail page.** A grid tile shows the flat
  product shot, so selecting model imagery for every card would be work nothing
  renders.

The migration adds two tables and alters none, so it cannot affect a live
catalog: every existing product simply has no shots and renders exactly as
before. `productMedia()` puts model shots first when they exist and is otherwise
unchanged, which is why the new ordering needed no backfill.

## Tests

```
npm test          # run once
npm run test:watch
```

The suite uses Node's built-in test runner with `tsx`, so it adds no
dependencies. Vitest requires `@types/node` v22+ while this project pins v20; a
toolchain bump is a poor trade for a suite of pure-function tests.

Coverage is deliberately narrow — the logic where a mistake costs money, access
or data. Everything tested is a pure function, so none of it needs a database.

- **`roles`** — the checks gating every admin route. The key assertion is that
  `SUPER_ADMIN` passes an admin check: this was previously thirteen hand-written
  `role !== "ADMIN"` comparisons, each of which would have excluded the new role,
  including the 2FA gate in `auth.ts`.
- **`validation`** — chiefly the charge-integrity guarantee: `checkoutSchema`
  has no price field, so a tampered request carrying one has it stripped before
  the route sees it. Also the swatch hex pattern, which is an injection surface.
- **`storage`** — the content-type allowlist, and the key pattern the local
  upload route checks a client-supplied path against before writing to disk.
- **`publicAsset`** — that image lookups cannot escape `public/`.
- **`swatch`**, **`orderStatus`**, **`product`** — colour resolution and its
  fallbacks, status wording, timeline projection, minor-unit money conversion,
  and product media ordering, including that model shots lead the gallery, sort
  by `sortOrder` without mutating the product, and that the hover video is still
  postered with the flat front image rather than whatever slot is now first.
- **`inventory`** — the low-stock threshold, which was typed out by hand in six
  places: two Prisma `lte: 3` filters, two `<= 3` comparisons colouring a table
  cell amber, one storefront "only N left" notice, and one sentence of prose
  telling an admin what "low stock" means. The tests assert the query filter and
  the predicate agree on the boundary — if they drifted, the dashboard would
  show a count the page it links to could not produce — and that the prose names
  the same number the query uses.
- **model view** — the caption built for a model shot, which omits a missing
  height or size rather than printing an empty segment and drops a stored `0cm`
  as the data error it is; plus the schema rules around it: a blank optional
  number reads as absent rather than failing, heights are bounded to a plausible
  human range, two shots of the same model are refused before Postgres can
  return an opaque unique-constraint error, and a client-supplied `sortOrder` is
  stripped.

The suite is mutation-checked: reverting `isAdminRole` to an exact `"ADMIN"`
comparison fails two tests, adding a `price` field back to `checkoutSchema` fails
one, loosening the hex pattern fails two, dropping the path-traversal guard fails
one, moving model shots to the end of the gallery fails four, and removing either
the zero-height guard, the duplicate-model check or the height bound fails one
each. Tests that cannot fail are not worth running.

Not covered, and worth being precise about: anything needing a database or
network. That includes the checkout transaction's stock decrement, payment
webhook signature verification, the staff-management lockout guards, and — added
more recently — the cron endpoint's authorisation and the current-password check
on `/api/account/password`. Those last two are security-relevant route handlers
rather than pure functions, so the suite does not reach them. They need
integration tests against a real Postgres instance, which is the natural next
step for this suite.

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
