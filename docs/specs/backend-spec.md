# Supporters — Backend Spec (Fastify)

Oct 28, 2026 · @The velnix

One Fastify API serves the Next.js web app and the Expo mobile app; product scope lives in [product-spec.md](product-spec.md).

## Stack and versions

The backend runs on Node.js 24 LTS and Fastify 5, written in TypeScript with strict mode on. Every version below is the latest stable release as of 28 Oct 2026, pinned exactly in `package.json` and updated monthly through Renovate.

| Layer              | Choice                                                          | Version                                | Why                                                                    |
| ------------------ | --------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Runtime            | Node.js                                                         | 24.22.x LTS "Krypton"                  | Active LTS. Node 26 is still Current, so we upgrade once it enters LTS |
| Framework          | Fastify                                                         | 5.12.x                                 | Fast, schema-first, plugin encapsulation                               |
| Language           | TypeScript                                                      | 7.0.x                                  | Native compiler. Fall back to 6.0 if any tool lags                     |
| Validation         | Zod + fastify-type-provider-zod                                 | 4.6.x / 7.0.x                          | One schema for runtime checks, types and OpenAPI                       |
| Database           | PostgreSQL on RDS                                               | 18.x                                   | Latest major. Supported to 2030                                        |
| ORM                | Prisma (prisma + @prisma/client)                                | 7.10.x                                 | Latest stable. The 8.0 tag is still a release candidate                |
| Cache and queues   | Valkey (Redis-compatible) + ioredis + BullMQ                    | 9.1 / 6.0 / 6.5                        | Open-source licence, same API as Redis                                 |
| Realtime           | Socket.IO + @socket.io/redis-adapter                            | 4.8.x / 8.3.x                          | Rooms, acks, reconnection, multi-server fan-out                        |
| Search             | Meilisearch + JS client                                         | 1.56 / 0.62                            | Typo-tolerant search, cheap to self-host                               |
| Security plugins   | @fastify/helmet, cors, rate-limit, jwt, cookie, csrf-protection | 13.2 / 11.3 / 11.2 / 10.2 / 11.1 / 8.0 | Official Fastify plugins                                               |
| Uploads            | @aws-sdk/client-s3 + s3-request-presigner                       | 3.11xx                                 | Presigned direct-to-S3 uploads                                         |
| Passwords          | argon2 (argon2id)                                               | 0.45.x                                 | OWASP-recommended hash                                                 |
| Payments           | razorpay                                                        | 2.9.x                                  | Subscriptions, webhooks, RazorpayX payouts                             |
| Logging and errors | pino + @sentry/node                                             | 10.4 / 11.9                            | Structured JSON logs, error tracking                                   |
| API docs           | @fastify/swagger                                                | 9.9.x                                  | OpenAPI 3.1, generated from the Zod schemas                            |
| Tests              | Vitest                                                          | 5.0.x                                  | Fast, native TypeScript and ESM                                        |

Also in use: sharp 0.35 (image re-encoding), web-push 3.6 (browser push with VAPID keys), and Caddy 2 on the server for origin TLS. The package manager is pnpm, set up as a workspace with `apps/api`, `apps/web`, `apps/mobile` and `packages/shared` (Zod schemas, types and constants shared by all three). Containers build from `node:24-slim` and run as a non-root user.

## Architecture and project layout

The backend is a modular monolith: one deployable Fastify app, split into feature modules that each own their routes, schemas, service and data access. The worker process runs from the same codebase with a different entry point.

**Request pipeline** (each step is a Fastify hook or plugin, registered in this order)

1. `@fastify/helmet` security headers. CORS allows only the mobile dev origins on staging; production web traffic is same-origin, so it needs no CORS.
2. `@fastify/under-pressure` sheds load (503 with `Retry-After`) when event-loop delay goes over 1 s or heap use over 90%.
3. `@fastify/rate-limit` backed by Valkey, keyed by user id when signed in and by IP otherwise. Limits are in Limits and quotas.
4. Authentication: read the access token from the `__Host-at` cookie (web) or the `Authorization: Bearer` header (mobile). Verify the EdDSA signature and expiry, then check the session id (`sid`) against a revoked-sessions set in Valkey. There is no database read per request.
5. CSRF check, for cookie-authenticated `POST`, `PUT`, `PATCH` and `DELETE` only: the `Origin` header must equal `https://<domain>`, and the `x-csrf-token` header must match the `__Host-csrf` cookie. Bearer-token (mobile) requests skip this step.
6. Zod validation of params, query, body and headers. Unknown keys are rejected with 400.
7. Authorization in the service layer: a role check plus an ownership or membership check on the exact resource.
8. Handler, then service, then Prisma, Valkey, S3 or a queue.
9. Response serialization through the Zod response schema, so fields outside it (password hash, tokens, private phone) never leak.
10. A central error handler returns RFC 9457 problem details (see API design) and logs the full error with the request id.

**Folder layout**

```
apps/api/
  src/
    app.ts              # builds the Fastify instance, registers plugins in order
    server.ts           # HTTP + Socket.IO entry
    worker.ts           # BullMQ worker entry (same image, different command)
    config/env.ts       # Zod-validated env, fails fast on boot
    plugins/            # security, auth, prisma, valkey, s3, swagger, sentry
    modules/
      auth/ users/ businesses/ verification/ categories/ products/ services/
      posts/ comments/ follows/ saves/ reviews/ search/ requirements/
      enquiries/ chat/ notifications/ subscriptions/ referrals/ wallet/
      payouts/ reports/ blocks/ events/ analytics/ uploads/ webhooks/ admin/
        <module>.routes.ts  <module>.schemas.ts  <module>.service.ts  <module>.test.ts
    jobs/               # queue producers and processors
    lib/                # errors, pagination, ids, money, time helpers
  prisma/schema.prisma  prisma/migrations/  prisma/seed.ts
  scripts/create-admin.ts   # the only way to create an admin account
packages/shared/        # Zod schemas, types, limits and enums used by api, web and mobile
```

- Modules talk to each other only through exported service functions, never through another module's tables.
- Money is stored as integer paise (`BIGINT`) and sent in JSON as `{ "amountPaise": 99900, "currency": "INR" }`. Amounts stay far below 2^53, so a JSON number is safe. Never floats.
- IDs are UUIDv7 generated by PostgreSQL 18's native `uuidv7()`. They are sortable by time and not guessable, so they are safe to expose.
- All timestamps are `timestamptz` in UTC. Clients format them in IST.
- Every limit in this spec (lengths, counts, sizes, rates) lives once in `packages/shared/limits.ts`, and the API, web and mobile all import it.

## Data model

The core is about 35 PostgreSQL tables. Every table has `id` (UUIDv7), `created_at` and `updated_at`. User-generated content is soft-deleted with `deleted_at` and purged after 30 days. Product rules behind these tables are in the main spec's Decisions and assumptions.

| Area             | Tables                                                                                                                    | Key fields and rules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | `users`, `user_interests`, `sessions`, `otp_codes`, `devices`, `consents`                                                 | `phone` (E.164, +91 only) is required and unique. `email` is nullable and unique when set, with `email_verified_at`. Also `role` (user or admin), `status` (active, suspended or deleted), `city_id`, and `password_hash` (argon2id). Admins also have `totp_secret` (encrypted). A session stores a hashed refresh token, the previous token's hash plus `rotated_at` (for the grace window), `family_id`, user agent, IP and `revoked_at`. An OTP stores a hashed code, its purpose (signup, login\_reset, email\_verify, phone\_change), attempts and `expires_at` |
| Business         | `businesses`, `business_verifications`, `verification_documents`                                                          | `owner_user_id` is **unique** (one business per user). Also slug (unique, immutable after verification), type, category and subcategory, city and state, GSTIN, `verification_status` (none, pending, verified or rejected), `premium_until`, and profile completion. Documents are stored as S3 keys under the private `kyc/` prefix                                                                                                                                                                                                                                 |
| Catalog          | `categories`, `products`, `services`, `listing_media`                                                                     | Categories are two levels (`parent_id`). Listings have price in paise (nullable, meaning "Ask for price"), MOQ, unit, availability enum, `specs` JSONB (up to 30 keys), service areas (a state list or All India) and status (draft, published or archived)                                                                                                                                                                                                                                                                                                           |
| Social           | `posts`, `post_media`, `comments`, `likes`, `saves`, `follows`, `feed_seen`                                               | Uniques on (user\_id, post\_id) for likes, and (user\_id, target\_type, target\_id) for saves. `follows` holds (user\_id, business\_id) with a unique pair. Comments have `parent_id`, and a reply to a reply is rejected. Counters are denormalized and updated in the same transaction                                                                                                                                                                                                                                                                              |
| Reviews          | `reviews`                                                                                                                 | Unique (user\_id, business\_id). Rating 1 to 5, text, `owner_reply`, `owner_replied_at` and `hidden_at`. The eligibility check (a thread at least 24 h old) runs in the service. `businesses.rating_avg` and `rating_count` are recomputed on every change                                                                                                                                                                                                                                                                                                            |
| Discovery        | `buyer_requirements`, `requirement_matches`, `requirement_quotes`                                                         | Status (open, closed, fulfilled or expired) and `expires_at` (+30 days). Matches record which businesses were shown or notified. Quotes are unique on (requirement\_id, business\_id)                                                                                                                                                                                                                                                                                                                                                                                 |
| Messaging        | `conversations`, `messages`, `conversation_state`, `enquiries`                                                            | A conversation is unique on (user\_id, business\_id). Per-side state holds `last_read_message_id`, `muted` and `hidden`. A message has a `client_id` (unique per sender, for idempotency), a type (text, image, file, listing\_card or enquiry) and attachment keys under the private `chat/` prefix. An enquiry links to its message, listing and status                                                                                                                                                                                                             |
| Notifications    | `notifications`, `notification_prefs`, `push_tokens`, `web_push_subscriptions`, `outbox_events`                           | Type, actor, target, `read_at` and `group_key` (for batching). Preferences are stored per category and channel. The outbox holds events written in the same transaction as the change                                                                                                                                                                                                                                                                                                                                                                                 |
| Money            | `subscriptions`, `payments`, `invoices`, `referrals`, `wallet_ledger`, `withdrawals`, `payout_accounts`, `webhook_events` | `subscriptions` belong to a **business**. `webhook_events` has a unique Razorpay event id (replay protection). The ledger is append-only and the balance is SUM(amount\_paise). Payout account numbers and UPI ids are encrypted at the column level (AES-256-GCM, key in SSM), with the validated holder name stored                                                                                                                                                                                                                                                 |
| Analytics        | `analytics_events`, `analytics_daily`                                                                                     | Raw events (profile\_view, listing\_click, post\_impression, enquiry) are kept 90 days. A nightly rollup into per-business per-day totals feeds the Hub charts                                                                                                                                                                                                                                                                                                                                                                                                        |
| Trust and safety | `reports`, `blocks`, `audit_logs`                                                                                         | Each report has a reason enum, status (open, actioned or dismissed) and the admin's action. Blocks are unique on (blocker, blocked). Admin actions and every money movement are audit-logged                                                                                                                                                                                                                                                                                                                                                                          |

- Every hot-path query has an index: foreign keys, `(business_id, status, created_at)`, `(conversation_id, created_at)`, `(user_id, read_at)`, `(category_id, city_id, status)` on requirements, and a partial index on published listings.
- Schema changes go through Prisma migrations only, reviewed in pull requests. Destructive changes ship in two steps (expand, then contract).
- `prisma/seed.ts` loads categories, Indian states and cities, and fake staging data. It never touches production.

## API design

The API is REST over JSON at `https://<domain>/v1`, documented with OpenAPI 3.1 at `/v1/docs` (enabled on staging only). CloudFront routes /v1/\* to the API and everything else to Next.js, so web and API share one origin (first-party cookies, no CORS for the web app). Mobile calls the same endpoints.

**Conventions**

- Resources are plural nouns in kebab-case (`/buyer-requirements`). The signed-in user's own resources live under `/me/...`, and their business under `/me/business/...`.
- **Pagination** uses cursors: `?cursor=<opaque>&limit=20` (max 50). Responses are `{ "data": [...], "nextCursor": "..." | null }`. There is no offset paging in the API. The one exception is internal: `GET /search` pages through Meilisearch, which only supports offsets, so its opaque cursor encodes an offset, results stop at 1,000 (`SEARCH_LIMITS.maxTotalHits`), and a page can shift if the index changes between requests. Clients treat it like any other cursor.
- **Errors** are RFC 9457 problem details with `Content-Type: application/problem+json`: `{ "type": "https://<domain>/errors/validation-failed", "title", "status", "detail", "code": "VALIDATION_FAILED", "errors": [{ "path", "message" }], "requestId" }`. Clients branch on `code`, never on `title` or `detail`. Stack traces never leave the server.
- **Idempotency:** writes that create money or messages (checkout, enquiries, quotes, withdrawals, messages) require an `Idempotency-Key` header (UUID). The first response is stored in Valkey for 24 h and replayed for the same key and user. The same key with a different body returns 422.
- **Formats:** timestamps are ISO 8601 UTC. Money is `{ amountPaise, currency: "INR" }`. Phones are E.164.
- **Versioning:** breaking changes go into `/v2`, and `/v1` gets 6 months' notice before it is retired. Mobile sends `X-App-Version`, and the API can answer `426 Upgrade Required` below a minimum version.

**Endpoint map**

| Module                | Endpoints                                                                                                                                                                                                                                                                                                                                                    | Access                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Auth                  | `POST /auth/otp/send` (purpose: signup, reset, email\_verify), `POST /auth/register` (needs a signup OTP), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password/reset`, `POST /auth/email/verify`, `GET /auth/csrf`                                                                                                           | Public, strict limits. `email/verify` is signed in |
| Me                    | `GET/PATCH /me`, `PUT /me/interests`, `GET /me/sessions`, `DELETE /me/sessions/:id`, `POST /me/phone/change`, `GET /me/export`, `DELETE /me`                                                                                                                                                                                                                 | User                                               |
| Categories and places | `GET /categories`, `GET /places/states`, `GET /places/cities?state=`                                                                                                                                                                                                                                                                                         | Public, cached 1 h                                 |
| Businesses            | `GET /businesses/:slug`, `GET /businesses/:id/{products,services,posts,reviews,followers}`, `POST /me/business`, `GET/PATCH /me/business`, `DELETE /me/business`                                                                                                                                                                                             | Public read, owner write                           |
| Verification          | `POST /me/business/verification` (document upload keys), `GET /me/business/verification`                                                                                                                                                                                                                                                                     | Owner                                              |
| Catalog               | `GET /products/:id`, `GET /services/:id`, `GET/POST /me/business/products`, `PATCH/DELETE /me/business/products/:id` (and the same for services)                                                                                                                                                                                                             | Public read, owner write                           |
| Feed and posts        | `GET /feed`, `GET /posts/:id`, `GET/POST /me/business/posts`, `PATCH/DELETE /me/business/posts/:id`, `PUT/DELETE /posts/:id/like`                                                                                                                                                                                                                            | Feed public (guest variant), writes signed in      |
| Comments              | `GET/POST /posts/:id/comments`, `DELETE /comments/:id`                                                                                                                                                                                                                                                                                                       | Read public, write user                            |
| Saves and follows     | `PUT/DELETE /saves/:type/:id`, `GET /me/saves`, `PUT/DELETE /follows/:businessId`, `GET /me/following`                                                                                                                                                                                                                                                       | User                                               |
| Reviews               | `POST /businesses/:id/reviews`, `PATCH/DELETE /reviews/:id`, `PUT /reviews/:id/reply` (owner)                                                                                                                                                                                                                                                                | User (eligible), owner for reply                   |
| Search                | `GET /search?q=&type=&category=&city=&state=&businessType=&verified=&priceMin=&priceMax=&availability=&moqMax=&ratingMin=&sort=&cursor=&limit=` (`type` is business, product, service or post, default business; filters that don't apply to the type are ignored), `GET /search/suggest?q=`, `GET /discover?city=`                                          | Public                                             |
| Requirements          | `GET /buyer-requirements` (matched to my business), `GET /me/buyer-requirements`, `POST /buyer-requirements`, `PATCH /buyer-requirements/:id` (close or fulfil), `POST /buyer-requirements/:id/quotes`                                                                                                                                                       | User. Quotes need a verified business              |
| Chat                  | `GET /conversations`, `POST /conversations` (with a businessId), `GET /conversations/:id/messages`, `POST /conversations/:id/messages` (REST fallback), `POST /conversations/:id/read`, `PATCH /conversations/:id` (mute or hide), `DELETE /messages/:id` (delete for me), `GET /attachments/:key` (signed-URL redirect)                                     | Members only                                       |
| Enquiries             | `POST /enquiries`, `GET /me/enquiries`, `GET /me/business/enquiries`, `PATCH /me/business/enquiries/:id` (close)                                                                                                                                                                                                                                             | User, owner                                        |
| Blocks and reports    | `PUT/DELETE /blocks/:userId`, `POST /reports`                                                                                                                                                                                                                                                                                                                | User                                               |
| Uploads               | `POST /uploads/presign` (purpose: avatar, cover, listing, post, chat, kyc), then `POST /uploads/:id/complete`                                                                                                                                                                                                                                                | User                                               |
| Events                | `POST /events` (a batch of up to 50 impression and view events)                                                                                                                                                                                                                                                                                              | Public, limited                                    |
| Notifications         | `GET /notifications`, `POST /notifications/read`, `GET/PUT /me/notification-prefs`, `POST/DELETE /me/push-tokens`, `POST/DELETE /me/web-push-subscriptions`                                                                                                                                                                                                  | User                                               |
| Premium               | `POST /me/business/premium/checkout` (web only), `GET /me/business/premium`, `POST /me/business/premium/cancel`, `GET /me/business/invoices/:id`                                                                                                                                                                                                             | Owner                                              |
| Referrals and wallet  | `GET /me/referrals`, `GET /me/wallet`, `GET /me/wallet/ledger`, `PUT /me/payout-account`, `POST /me/withdrawals`, `GET /me/withdrawals`                                                                                                                                                                                                                      | User                                               |
| Webhooks              | `POST /webhooks/razorpay`                                                                                                                                                                                                                                                                                                                                    | Signature-verified                                 |
| Admin                 | `GET /admin/verifications`, `POST /admin/verifications/:id/{approve,reject}`, `GET /admin/reports`, `POST /admin/reports/:id/action`, `GET /admin/users`, `POST /admin/users/:id/{suspend,restore}`, `GET /admin/withdrawals`, `POST /admin/withdrawals/:id/{approve,reject}`, `POST /admin/wallet/bonus`, CRUD `/admin/categories`, `GET /admin/audit-logs` | Admin with TOTP, IP allow-list                     |

## Limits and quotas

These values live in `packages/shared/limits.ts`. Rate limits are sliding windows in Valkey. When one is hit, the API returns 429 with `Retry-After` and code `RATE_LIMITED`.

| Action                             | Limit                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Any API call (guest, per IP)       | 300 per minute                                                               |
| Any API call (signed in, per user) | 600 per minute                                                               |
| `POST /auth/login`                 | 5 per minute per IP, 10 per hour per account, then a 15 min lockout          |
| OTP send                           | 1 per 30 s, 5 per hour per phone or email, 20 per hour per IP                |
| OTP verify                         | 5 attempts per code                                                          |
| Enquiries                          | 20 per day per user, 1 per listing per 24 h                                  |
| Buyer requirements                 | 3 new per day, 10 open at once                                               |
| Quotes                             | 1 per requirement per business, 50 per day per business                      |
| Messages (socket or REST)          | 30 per 10 s per user, and 200 new conversations per day                      |
| Comments                           | 30 per hour per user                                                         |
| Reports                            | 20 per day per user                                                          |
| Upload presign                     | 60 per hour per user                                                         |
| Search                             | 60 per minute per IP                                                         |
| Suggest (autocomplete)             | 60 per minute per IP, a separate budget from search; clients debounce typing |
| Events                             | 120 batches per minute per IP                                                |
| Withdrawals                        | 1 pending at a time, minimum ₹100                                            |

| Content                                     | Limit                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Images (avatar, cover, listing, post, chat) | JPEG, PNG, WebP or HEIC, up to 10 MB each, re-encoded to WebP. SVG and GIF are rejected                                     |
| Video (posts only)                          | MP4 (H.264 or HEVC), up to 60 s and 100 MB                                                                                  |
| Documents (chat, KYC)                       | PDF up to 10 MB, plus JPEG or PNG for KYC                                                                                   |
| Images per listing or post                  | 1 to 10                                                                                                                     |
| Text                                        | Post 2,200 characters, comment 1,000, message 4,000, review 20 to 1,000, listing description 5,000, requirement 20 to 1,000 |
| Free plan                                   | 25 published listings, 10 posts per 7 days                                                                                  |

## Realtime, jobs and notifications

Chat runs on Socket.IO inside the API process. Anything slow or retryable (push, email, search indexing, payouts) goes to a BullMQ queue that the worker process handles.

**Realtime chat (Socket.IO at `/v1/ws`)**

- **Handshake auth:** web clients connect same-origin, and the browser sends the `HttpOnly` `__Host-at` cookie. The server verifies it and requires `Origin: https://<domain>`. Mobile clients pass the access token in `auth.token`. Either way, the socket joins `user:<id>` (and `business:<id>` for an owner) and is rejected if the session is revoked.
- **Token expiry:** the server records the token's `exp`. Shortly before it expires, the client refreshes over HTTP and sends `auth:renew` with the new token (mobile) or just re-emits it (web, where the cookie is already new). A socket that doesn't renew is disconnected at `exp` with reason `token_expired`. A revoked session disconnects at once through a Valkey pub/sub signal.
- **Sending:** the client emits `message:send {conversationId, clientId, type, body, attachmentKeys?}`. The server checks membership and blocks, validates the payload, saves the message, emits `message:new` to both sides' rooms, and acks with `{ id, createdAt }`. A repeated `clientId` returns the original ack without creating a duplicate.
- **Other events:** `typing` (sent at most every 3 s, expires after 5 s), `message:read {conversationId, messageId}`, and `presence` (online while a socket is connected, kept in Valkey with a 60 s TTL and heartbeat). Last-seen is not shown in v1.
- **Limits:** see Limits and quotas. Attachments are S3 keys from the upload flow (purpose `chat`), never raw files.
- **Scaling:** `@socket.io/redis-adapter` is on from day one, so a second server works without code changes. CloudFront passes WebSocket upgrades on `/v1/ws`.
- **Catch-up:** clients that were offline load missed messages through `GET /conversations/:id/messages?after=<id>`.

**Queues (BullMQ on Valkey)**

| Queue           | Job                                                                                                                                                                                                                                                                                 | Retry             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `notifications` | Fan out an event to in-app, push and email, respecting user preferences                                                                                                                                                                                                             | 5× exponential    |
| `push`          | Send in batches through the Expo Push API (mobile) and web-push with VAPID (browsers), honouring quiet hours (22:00 to 08:00 IST), and prune invalid tokens and expired subscriptions                                                                                               | 5×                |
| `email`         | Send through Amazon SES using templated emails                                                                                                                                                                                                                                      | 5×                |
| `search-index`  | Apply `search.sync` outbox events: re-read the row with the public-page rules and upsert or delete it in Meilisearch (a business also refreshes its listings and posts). Every write that changes searchable fields or visibility records one in its transaction. One job at a time | 10×, dead-letter  |
| `media`         | Check the upload's type and size, strip EXIF, build image variants (sharp)                                                                                                                                                                                                          | 3×                |
| `payments`      | Process Razorpay webhooks and update subscriptions and referrals                                                                                                                                                                                                                    | 10×, dead-letter  |
| `payouts`       | Run an admin-approved withdrawal through RazorpayX, then reconcile                                                                                                                                                                                                                  | Manual retry only |
| `cron`          | Expire requirements and OTPs, send renewal reminders, roll up analytics nightly; hourly, queue a search sync for businesses whose Premium just ended (drops the search boost)                                                                                                       | n/a               |

**Notification pipeline:** a domain event (such as `enquiry.created`) writes the `notifications` row in the same transaction, using the outbox pattern. A job then delivers it to the user's enabled channels. Likes and follows are batched in a 10-minute window.

## Security

The standard is OWASP ASVS 5.0 Level 2 plus the OWASP API Security Top 10 (2023). No release ships with an open high or critical finding.

**Authentication and sessions**

| Item               | Rule                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwords          | argon2id (memory 19 MiB, t=2, p=1). 10 to 128 characters, checked against a breached-password list (k-anonymity range check), with no composition rules                                                                                                                                                                                                                         |
| Access token       | JWT signed with EdDSA (Ed25519), 15 min lifetime, with claims `sub`, `sid`, `role`, `iat`, `exp` and `kid`. Keys live in SSM and rotate every 90 days, keeping the old public key for 1 day                                                                                                                                                                                     |
| Refresh token      | Opaque 256-bit random value, stored as a SHA-256 hash, valid 30 days (sliding, with a 90-day absolute maximum), and **rotated on every use**                                                                                                                                                                                                                                    |
| Refresh races      | For 10 s after a rotation, presenting the _previous_ token returns the same new pair instead of failing. This is needed because web tabs and the Next.js proxy can refresh at the same moment. After 10 s, reuse of an old token counts as theft: the whole session family is revoked and the user gets a security alert                                                        |
| Web cookies        | Set by the API on `/v1/auth/*` responses: `__Host-at` (access) and `__Host-rt` (refresh), both `HttpOnly; Secure; SameSite=Lax; Path=/` with no `Domain` (the `__Host-` prefix requires `Path=/`), plus `__Host-csrf` (not HttpOnly, so scripts can read it for the CSRF header). Max-Age matches each token's lifetime. Tokens never appear in response bodies for web clients |
| Mobile tokens      | Login and refresh return `{ accessToken, refreshToken, expiresIn }` only when the request has `X-Client: mobile`. The app stores them with expo-secure-store and sends `Authorization: Bearer`                                                                                                                                                                                  |
| CSRF               | For cookie-authenticated writes, `Origin` must equal `https://<domain>` _and_ `x-csrf-token` must equal the `__Host-csrf` cookie, a random 32-byte token rotated at login. `SameSite=Lax` adds a third layer                                                                                                                                                                    |
| OTP                | 6 digits from a CSPRNG, stored as an HMAC, expiring in 5 min, with 5 attempts. Limits are in Limits and quotas. SMS goes through MSG91 on a DLT-approved template, and email OTPs through SES                                                                                                                                                                                   |
| Login abuse        | Same error for unknown account and wrong password, with constant-time comparison. Lockout and progressive delay are in Limits and quotas                                                                                                                                                                                                                                        |
| Session control    | Logout revokes the session (database plus Valkey revoked set). Users can list and revoke devices. A password or phone change revokes every other session                                                                                                                                                                                                                        |
| Device attestation | Signup and withdrawal requests from mobile carry a Play Integrity (Android) or App Attest (iOS) token, verified server-side. Failure doesn't block the request but flags it for review and blocks referral rewards                                                                                                                                                              |
| Admin              | Role `admin`, created only through `scripts/create-admin.ts`. TOTP is required at every login, admin sessions last 8 h with no refresh, `/v1/admin/*` sits behind a WAF IP allow-list, and every action is audit-logged                                                                                                                                                         |

**OWASP API Top 10 controls**

| Risk                                     | Control                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API1 Broken object-level authorization   | Every query filters by owner or membership in the service layer (`where: { id, businessId: ctx.businessId }`). Tests try other users' ids on every route |
| API2 Broken authentication               | The token model above, plus strict limits on the auth routes                                                                                             |
| API3 Broken property-level authorization | Zod input schemas list writable fields only, so there is no mass assignment. Response schemas strip private fields                                       |
| API4 Unrestricted resource consumption   | Rate limits, body limit 1 MB, max page size 50, upload size caps, query timeouts, and under-pressure load shedding                                       |
| API5 Broken function-level authorization | Role guard on route groups, and `/admin/*` sits behind a separate guard plus MFA                                                                         |
| API6 Sensitive business flows            | Referral fraud checks (device, phone, payment), idempotency keys, and manual approval for payouts                                                        |
| API7 SSRF                                | The server never fetches user-supplied URLs. Link previews (if built) go through an allow-listed fetcher with private IP ranges blocked                  |
| API8 Security misconfiguration           | Helmet headers, a strict CORS allow-list, docs off in production, generic errors, no default credentials                                                 |
| API9 Improper inventory                  | One OpenAPI spec generated from code, `/v1` versioning, old versions retired on schedule                                                                 |
| API10 Unsafe consumption of APIs         | Razorpay webhooks verified with HMAC-SHA256 and a timing-safe compare. Third-party responses are validated with Zod                                      |

**Payments and money**

- **Checkout:** `POST /me/business/premium/checkout` creates a Razorpay Subscription for the business and returns its id for Razorpay Checkout on the web. Requests sent with `X-Client: mobile` are refused, so the apps never sell Premium.
- **Source of truth:** payment status is trusted only from signature-verified webhooks (`subscription.charged`, `subscription.halted`, `subscription.cancelled`, `payment.failed`, `refund.processed`) or a server-side fetch, never from the client. Webhook event ids are stored to block replays, and handlers are idempotent.
- **Invoices:** GST invoice numbers are sequential per financial year (`SUP/2026-27/000123`). The PDF is generated by the worker and stored under a private prefix.
- **Ledger:** append-only. Every wallet change is one database transaction that locks the user's wallet row (`SELECT ... FOR UPDATE`) and writes an audit log.
- **Withdrawals:** need a verified phone, a RazorpayX-validated payout account whose holder name matches the profile name (fuzzy match, with mismatches going to admin review), admin approval, and no payout-details change in the last 24 h. Payouts use RazorpayX idempotency keys and are reconciled from payout webhooks.

**Uploads**

- **Flow:** the client calls `POST /uploads/presign {purpose, contentType, size}`. The API checks the limits and returns a presigned S3 PUT URL (valid 5 min) locked to the exact content type and size. After the upload, `POST /uploads/:id/complete` queues the `media` job. The upload can't be attached to anything until that job passes.
- **Checks:** magic bytes must match the declared type. Images are decoded and re-encoded with sharp into WebP variants, with EXIF and GPS stripped. Videos get their duration and codec checked with ffprobe. Anything that fails is deleted.
- **Buckets and prefixes:** one private bucket. `public/` (avatars, covers, listing and post media) is served only through `media.<domain>` with CloudFront Origin Access Control. `chat/` and `kyc/` are never served by the public distribution. Chat files use 5-minute CloudFront signed URLs for conversation members. KYC files use 5-minute S3 presigned GET links for admins only.
- **Safe serving:** `media.<domain>` sends `X-Content-Type-Options: nosniff`, and PDFs go out with `Content-Disposition: attachment`. Because media is on a separate domain from the app, a malicious file can't read app cookies.
- **Orphans:** uploads not attached within 24 h are deleted by a nightly job.

**Infrastructure and secrets**

- Secrets live in AWS SSM Parameter Store (SecureString, KMS) and load at container start. Nothing is in git, and `.env` is for local development only.
- RDS sits in a private subnet with storage encryption, TLS required (`sslmode=verify-full`), and point-in-time recovery for 7 days. Valkey and Meilisearch are reachable only on the Docker network and require a password or master key. The API uses a scoped Meilisearch key, and clients never call Meilisearch directly.
- **Origin protection:** Caddy terminates TLS on the EC2 server and drops any request without CloudFront's secret `X-Origin-Verify` header (rotated quarterly). The security group allows 443 only from CloudFront's managed prefix list. SSH is closed, and access goes through SSM Session Manager.
- AWS WAF on CloudFront uses the managed core and known-bad-inputs rule sets, plus rate rules on `/v1/auth/*` and an IP allow-list on `/admin*` and `/v1/admin/*`.
- IAM follows least privilege: the instance role can reach its own S3 bucket, SES, its own SSM path and CloudWatch, and nothing else. CloudTrail and GuardDuty are on.

**Data protection (DPDP Act 2023)**

- Consent is recorded (version and time) at signup and when the policy changes. Users can access, correct and export their data (`GET /me/export` emails a ZIP link valid for 24 h).
- **Account deletion** (`DELETE /me`) needs an OTP and a 7-day cooling-off period, during which logging in cancels it. After that, the business page, listings, posts, comments, reviews, follows and media are deleted. In other people's chats, messages remain under "Deleted user". The user must withdraw any wallet balance of ₹100 or more first, and balances under ₹100 are forfeited after a warning. Payments, invoices and the ledger are kept with personal data reduced to the minimum, as accounting law requires (8 years).
- PII is minimized. Phone numbers are hidden unless the owner opts in or the buyer consents in an enquiry. Payout details use column-level encryption.
- Logs redact `authorization`, `cookie`, `set-cookie`, passwords, OTPs, tokens, phone numbers, emails and payout fields (pino `redact`). Retention: application logs 30 days, audit logs 1 year, raw analytics events 90 days.

**Supply chain**

- Lockfile committed and `pnpm install --frozen-lockfile` in CI. Renovate updates dependencies, with a 3-day minimum release age.
- CI runs `pnpm audit`, GitHub Dependabot alerts, CodeQL, and secret scanning with push protection.
- Docker images build from node:24-slim in multiple stages, run as a non-root user with a read-only root filesystem, and are scanned by ECR enhanced scanning. A critical CVE blocks the deploy.

## Testing, observability and delivery

A pull request merges only when lint, type-check, tests and security scans pass. Deploys go to staging automatically, then to production after a manual approval.

**Testing**

- Unit tests with Vitest for services and pure logic (referral rules, ledger, pagination), with 80% line coverage on `modules/*/service`.
- Integration tests hit the API through `fastify.inject()` against real PostgreSQL 18 and Valkey in Testcontainers. Each test is isolated by a transaction.
- An authorization test matrix: every protected route is called as a guest, another user, the owner and an admin.
- Contract tests check the OpenAPI spec diff, and fail on breaking changes to `/v1`.
- Before each release: a k6 load test (feed, search, chat) and an OWASP ZAP baseline scan against staging.

**Observability**

- pino JSON logs carry `requestId`, `userId` and latency, and are shipped to CloudWatch Logs with 30-day retention.
- Sentry captures errors and performance traces at a 10% sample rate.
- `/health` (liveness) and `/ready` (DB, Valkey and queue checks) feed CloudWatch alarms for 5xx rate, p95 latency, CPU, DB connections and queue backlog.

**CI/CD (GitHub Actions)**

1. On a pull request: install with the frozen lockfile, run lint (ESLint 10), type-check, tests, `pnpm audit` and CodeQL.
2. On merge to `main`: build the Docker image, scan it, push to ECR, run `prisma migrate deploy` on staging, and deploy to staging.
3. Manual approval, then the same image goes to production with a health-checked rollout. Rollback means redeploying the previous image tag.

**Definition of done for any backend feature**

- [ ] Zod schemas for the request and response, shared through `packages/shared`
- [ ] Ownership and role checks, plus authorization tests
- [ ] Rate limit set for the route
- [ ] Indexes reviewed for new queries
- [ ] OpenAPI updated (generated) and the endpoint listed above
- [ ] Audit log for admin or money actions
- [ ] No secrets or PII in logs
