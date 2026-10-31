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

## Tests

- `pnpm --filter @supporters/web test`: Vitest unit tests.
- `pnpm --filter @supporters/web e2e`: Playwright, local only for now. It needs Docker running `apps/api/docker-compose.yml`, a prepared `apps/api/.env` with migrations applied, and nothing on port 3001. It starts its own API (to read the dev OTPs it prints) and reuses a running `next dev`. Run `pnpm --filter @supporters/web exec playwright install chromium` once.
  - `e2e/auth.spec.ts`: register, OTP, signed in.
  - `e2e/business-catalog.spec.ts`: create a business with a logo, add a product with a photo (presign, direct PUT to MinIO, complete), then view the public product and business pages, including their JSON-LD. It also needs MinIO from the same compose file, `pnpm storage:init` and `pnpm db:seed` (states, cities and categories) in `apps/api`. Each run registers a new account and business.
  - If ports 5432, 6379 or 9000 are taken, start compose with `POSTGRES_PORT`, `VALKEY_PORT` and `MINIO_PORT` and change the URLs in `apps/api/.env` to match (see `apps/api/README.md`).
