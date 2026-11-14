# @supporters/web

The Next.js 16 web app. Spec: [`docs/specs/web-spec.md`](../../docs/specs/web-spec.md).

## Local setup with the API

Auth runs against the real API, so start it first (see [`apps/api/README.md`](../api/README.md)), then `pnpm dev:web`.

In development, `next.config.ts` rewrites `/v1/*` to the API (`API_INTERNAL_URL`, default `http://127.0.0.1:3001`), as CloudFront does in production, so the browser sees one origin and the API's first-party cookies work. The API's `APP_ORIGIN` must be `http://localhost:3000`, the default in its `.env.example`. Open the app at `http://localhost:3000`, not `127.0.0.1`.

The API sets `__Host-` cookies with `Secure` even locally. Chromium and Firefox accept `Secure` cookies from `http://localhost`, so no dev-only change is needed. Safari does not, so use Chrome or Firefox for local sign-in.

Copy `.env.example` to `.env.local` only if the API runs somewhere else.

## Auth in short

- `proxy.ts` refreshes the access token on page requests (when `__Host-at` is missing or expires within 60 s) and redirects signed-out visitors of signed-in routes to `/login?next=...`.
- `dal/` is server-only. `getSession()` calls `GET /v1/me` once per request and returns a small DTO; `requireSession()` redirects to login.
- `lib/api/client.ts` is the browser client: it sends `x-csrf-token` on writes, refreshes once on a 401 (shared by concurrent requests) and retries, and maps RFC 9457 `code`s to messages.

## Security headers and CSP

`proxy.ts` sets a per-request nonce and the strict CSP (`lib/security/csp.ts`); `next.config.ts` sets the static headers (`lib/security/headers.ts`). Env (read per request): `CSP_MODE=report-only` to stage it, `CSP_REPORT_URL`, `CSP_UPLOAD_ORIGINS` (S3 endpoints), `MEDIA_PUBLIC_URL`, `APP_ORIGIN`. Browser-run checks: `E2E_PROD=1 LOCAL_API_PROXY=1` build, then `E2E_PROD=1 pnpm e2e`; every e2e test fails on a CSP violation (`e2e/fixtures.ts`).

## Tests

- `pnpm --filter @supporters/web test`: Vitest unit tests.
- `pnpm --filter @supporters/web e2e`: Playwright, local only for now. It needs Docker running `apps/api/docker-compose.yml`, a prepared `apps/api/.env` with migrations applied, and nothing on port 3001. It starts its own API (to read the dev OTPs it prints) and reuses a running `next dev`. Run `pnpm --filter @supporters/web exec playwright install chromium` once.
  - `e2e/auth.spec.ts`: register, OTP, signed in.
  - `e2e/business-catalog.spec.ts`: create a business with a logo, add a product with a photo (presign, direct PUT to MinIO, complete), then view the public product and business pages, including their JSON-LD. It also needs MinIO from the same compose file, `pnpm storage:init` and `pnpm db:seed` (states, cities and categories) in `apps/api`. Each run registers a new account and business.
  - `e2e/feed-social.spec.ts`: an owner creates a business and publishes a post with a photo (Hub), a second user sees it in their feed, likes it, opens it, comments and deletes the comment, then follows the business, saves the post and finds it under Saved. Same prerequisites as above. It registers three accounts, so repeated runs can hit the API's register rate limit; flush the compose Valkey (`FLUSHDB`) or restart it to reset.
  - `e2e/messaging.spec.ts`: a buyer opens a chat from a business page, sends text and a photo (presign with purpose `chat`; it opens only through `/v1/attachments/:id`), and the owner sees it live with an unread badge. Read ticks, typing, links (`rel` with `ugc`), delete for me, mute, hide, block and unblock. Same prerequisites as above, and two accounts per run.
  - `e2e/enquiry.spec.ts`: an owner publishes a product; a buyer sends a Contact Supplier enquiry (with the shared-phone consent); the owner sees it live in `/business/enquiries`, replies from the thread, and the buyer sees the reply; the enquiry turns Responded, the owner closes it, and a second enquiry for the same listing shows the rate-limit message. Same prerequisites as above, and two accounts per run.
  - If ports 5432, 6379 or 9000 are taken, start compose with `POSTGRES_PORT`, `VALKEY_PORT` and `MINIO_PORT` and change the URLs in `apps/api/.env` to match (see `apps/api/README.md`).
