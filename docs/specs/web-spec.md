# Supporters — Web Frontend Spec (Next.js)

Oct 28, 2026 · @The velnix

The web app moves the existing Next.js 16 prototype in `frontend/` from mock data to the API in [backend-spec.md](backend-spec.md); product scope lives in [product-spec.md](product-spec.md).

## Stack and versions

The web app runs on Next.js 16.4 (App Router) with React 19.3 on Node.js 24 LTS. The repo is on 16.4.6, the latest patch as of 14 Nov 2026 (it clears every advisory the registry lists for 16.4.2 to 16.4.4).

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js, App Router, Turbopack | 16.4.3 | Proxy (`proxy.ts`, formerly Middleware), nonce CSP |
| UI runtime | React / React DOM | 19.3.1 | Server Components by default |
| Runtime | Node.js | 24.22.x LTS | Same as the API |
| Language | TypeScript, strict | 7.0.x (6.0 fallback) |  |
| Styling | Tailwind CSS + shadcn/ui (CLI 4.23, Radix UI primitives) | 4.3.x | Components come from packages/ui-web, and tokens from packages/design-tokens (see UI system) |
| Icons | lucide-react (already in use) | latest |  |
| Client data | TanStack Query | 5.105.x | Chat, notifications, infinite feeds, optimistic likes |
| Forms | react-hook-form + Zod from `packages/shared` | 7.91 / 4.6 | Same rules as the API |
| Realtime | socket.io-client | 4.8.x |  |
| Errors | @sentry/nextjs | latest | Source maps uploaded, not served |
| Lint | ESLint + eslint-config-next | 10.13 / 16.4.x |  |
| Tests | Vitest + Testing Library, Playwright | 5.0 / 1.64 |  |

The app lives in the pnpm workspace as `apps/web`. Before any code change, read the matching guide in `node_modules/next/dist/docs/`, as `AGENTS.md` requires.

## App structure and rendering

Public pages render on the server for SEO. Signed-in, interactive areas are Server Component shells with small Client Components inside. The current routes in `frontend/app` are kept and regrouped.

```
apps/web/
  proxy.ts                     # CSP nonce, security headers, token refresh, optimistic auth redirect
  public/sw.js                 # Web Push service worker (push + notification click only, no caching)
  app/
    layout.tsx  not-found.tsx  error.tsx  global-error.tsx  api/health/route.ts
    (public)/                  # SSR, indexable
      page.tsx                 # home feed: guest variant or personalized
      business/[slug]/         # tabs: Products, Services, Posts, Reviews
      product/[id]/  service/[id]/  post/[id]/  discover/  search/
      about/ help/ terms/ privacy/ refund-policy/ community-guidelines/ report-problem/
    (auth)/login/  register/  verify/  forgot-password/  reset-password/  onboarding/
    (app)/                     # signed-in only, noindex
      messages/[[...id]]/  notifications/  saved/  profile/  settings/  create/
      requirements/  requirements/new/  referral/  wallet/  wallet/withdraw/
      business/manage/  edit/  products/  services/  posts/  enquiries/
      business/analytics/  verification/  premium/  settings/
    (admin)/admin/             # admin role + TOTP, noindex, WAF IP allow-list
      login/  verifications/  reports/  users/  withdrawals/  categories/  audit-logs/
  src/
    dal/                       # server-only data access (calls the Fastify API)
    features/<feature>/        # client components + hooks
    components/                # existing layout, feed, product, messaging components
    lib/                       # api client, query client, socket, formatters
```

The existing `subscription/` route moves to `business/premium/`, because Premium belongs to a business.

- Business pages change from `business/[id]` to `business/[slug]`, and the old `[id]` URLs redirect permanently.
- **Server Components** handle the first render of every page (business, product, feed first page). They fetch through the DAL and pass only plain, filtered data to the client.
- **Client Components** handle interaction only: like and save buttons, the post composer, chat window, notification bell, and filters. They are marked `'use client'` at the leaf, never at the page.
- **Caching:** every HTML page renders dynamically, because the nonce-based CSP (see Security) needs a fresh nonce per request and the Next 16 docs say nonces are incompatible with Partial Prerendering. Speed comes from the data layer instead. The API caches hot public data (categories, business profiles, feed pages) in Valkey, the DAL dedupes calls per request with React `cache()`, and CloudFront caches only `/_next/static`, images and media. Cache Components and `'use cache'` stay off in v1.
- The current `AppContext` and `lib/mock-data` are removed once each screen is wired. Mock data stays only in tests and Storybook fixtures.

## UI system

All web UI is built from one shared component library, `packages/ui-web`, based on **shadcn/ui** (CLI 4.23.0, Tailwind CSS 4.3, Radix UI 1.8). App code never styles raw HTML for something the library already covers.

```
packages/
  design-tokens/   # single source: colours, radius, spacing, type scale, shadows, z-index
    tokens.ts      # typed values (also used by mobile)
    tokens.css     # the same values as CSS variables (light theme; dark-ready)
  ui-web/          # shadcn/ui components, owned and versioned by us
    components.json   # shadcn monorepo config: aliases point into this package
    src/components/   # button.tsx, input.tsx, card.tsx, dialog.tsx, sheet.tsx, tabs.tsx, ...
    src/patterns/     # composed pieces: BusinessCard, ProductCard, FeedPostCard, EmptyState, ...
    src/lib/utils.ts  # cn(): clsx + tailwind-merge
```

- **Adding a component:** run `pnpm dlx shadcn@latest add <name>` from `packages/ui-web` (the monorepo `components.json` places it there), then adapt it to the tokens. Components are copied into our code, so we own and review every line.
- **Variants** use `class-variance-authority` (0.7). Every component exposes the same variant names as its mobile twin: `variant` (default, secondary, outline, ghost, destructive, link) and `size` (default, sm, lg, icon). Names follow shadcn/ui and React Native Reusables so CLI updates apply cleanly. Web also has xs and icon-xs, icon-sm, icon-lg.
- **Tokens only:** colours, radius and spacing come from CSS variables in `tokens.css`, which are mapped in the Tailwind `@theme`. Hex values or arbitrary values like `bg-[#111111]` in app code fail lint. The prototype's hard-coded colours migrate to tokens as each screen is wired.
- **Existing components** (`components/common/*`, `feed/*`, `product/*`, `messaging/*`) are rebuilt on library primitives and moved to `ui-web/src/patterns`. The duplicate pieces, such as `Badge`, `Avatar`, `Toast` and `ConfirmationDialog`, are replaced by shadcn `Badge`, `Avatar`, `Sonner` and `AlertDialog`.
- **Accessibility** comes from Radix (focus traps, keyboard, ARIA). Wrappers must not remove it.
- **Documentation:** every component has a Storybook story with each variant, and the stories double as visual tests.

## Auth and data access

The Fastify API owns all auth (cookie rules in the backend spec's Security section). Next.js never mints tokens. It forwards the API's `HttpOnly` cookies, refreshes them in `proxy.ts` when needed, and checks the session on every server render. CloudFront serves the web app and `/v1/*` on one origin, so these are first-party cookies.

**Sessions**

- **Sign-in forms** (register, login, OTP, reset) post from the browser to `/v1/auth/*`, and the API sets `__Host-at`, `__Host-rt` and `__Host-csrf`.
- **Refresh in `proxy.ts`:** on each page request, if `__Host-at` is missing or expires within 60 s (it reads `exp` without verifying, for timing only) and `__Host-rt` is present, the proxy calls `POST /v1/auth/refresh` server-to-server, forwarding the cookies. It copies the new `Set-Cookie` headers onto the response and the new access cookie onto the request the page renders with. The API's 10-second grace window makes parallel refreshes from several tabs safe.
- **Optimistic redirect:** an `(app)` or `(admin)` route with no `__Host-rt` cookie (or a failed refresh) redirects to `/login?next=<path>`. `next` must be a relative path starting with `/` and not `//`. This is a convenience only and never decides access.
- **Real check:** the DAL's `getSession()` (wrapped in React `cache()`) calls `GET /v1/me` with the incoming cookies. Every `(app)` and `(admin)` layout and page calls it. A 401 redirects to login, and `(admin)` also requires `role === 'admin'`, or it returns 404.
- **Client side:** the API client reads the CSRF token from the `__Host-csrf` cookie and sends it as `x-csrf-token` on writes. On a 401 it calls refresh once (shared across concurrent requests), retries, and otherwise sends the user to login.
- **Socket.IO** connects to `/v1/ws` on the same origin, and the browser sends the cookie automatically. On `token_expired` the client refreshes and reconnects.

**Data Access Layer (`src/dal`)**

- Every file starts with `import 'server-only'`. It is the only place that reads `process.env` server values or calls the API from the server.
- It forwards the `cookie` header and the `x-request-id` header, validates responses with the shared Zod schemas, and returns small DTOs, never raw API objects.
- `experimental.taint` is on. The session's raw token values are tainted so they can never be passed to a Client Component.

**Mutations**

- Client Components call `/v1/*` directly through TanStack Query mutations. Each sends the CSRF header and an `Idempotency-Key` where the API requires one, then calls `router.refresh()` or invalidates queries.
- **No Server Actions in v1.** The API is the single place where writes are authorized, which avoids a second, publicly POST-able write surface. If we add Server Actions later, each one re-checks the session and validates input with Zod, and `serverActions.allowedOrigins` is set.
- **Premium checkout** (web only) calls `POST /v1/me/business/premium/checkout`, then opens Razorpay Checkout loaded with `next/script` carrying the request nonce. The success screen polls `GET /v1/me/business/premium` until the webhook has activated Premium, and never trusts the checkout callback alone.
- **Web Push** is opt-in from Settings. The app registers `public/sw.js`, subscribes with the API's VAPID public key, and posts the subscription to `/v1/me/web-push-subscriptions`. The service worker only shows notifications and opens the deep link, with no caching or fetch handling.
- **Analytics events:** a small client hook batches impressions (a post 50% visible for 1 s) and views, and sends them to `POST /v1/events` every 10 s or on page hide (`navigator.sendBeacon`).

## Security

The web app follows OWASP ASVS 5.0 Level 2. Its main jobs are to stop XSS, keep tokens out of JavaScript, and never trust the client. Authorization itself lives in the API.

**Content Security Policy (strict, nonce-based)**

`proxy.ts` generates a fresh nonce per request, sets it in `x-nonce`, and sends:

```
default-src 'self';
script-src 'self' 'nonce-<nonce>' 'strict-dynamic' https://checkout.razorpay.com;
style-src 'self' 'nonce-<nonce>';
style-src-attr 'unsafe-inline';
img-src 'self' blob: data: https://media.<domain> https://<s3-upload-host>;
media-src 'self' blob: https://media.<domain> https://<s3-upload-host>;
connect-src 'self' wss://<domain> https://media.<domain> https://<s3-upload-host> https://*.ingest.sentry.io https://api.razorpay.com https://lumberjack.razorpay.com;
frame-src https://api.razorpay.com https://checkout.razorpay.com;
worker-src 'self';
font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests;
report-to csp-endpoint;

# sent alongside:
Reporting-Endpoints: csp-endpoint="<sentry-security-endpoint>"
```

`<s3-upload-host>` is the bucket's regional S3 endpoint that presigned PUT URLs point to. The Razorpay hosts are taken from Razorpay's current CSP guidance and re-checked before launch.

- The policy ships in `Content-Security-Policy-Report-Only` on staging for a week first, then is enforced. Violations are reported to Sentry.
- No `'unsafe-eval'` in production, and `'unsafe-inline'` only for style *attributes* (`style-src-attr`): `next/image` and Radix write `style="..."` into server HTML, which a nonce cannot cover. Scripts and `<style>` elements are nonce-only. `<s3-upload-host>` is also in `img-src`/`media-src` because private chat attachments redirect to a presigned S3 URL.
- Runtime config: `CSP_MODE` (`enforce` by default, `report-only` for a staged rollout), `CSP_REPORT_URL` (Sentry security endpoint; default is the built-in `/csp-report` log sink), `CSP_UPLOAD_ORIGINS`, `MEDIA_PUBLIC_URL`, `APP_ORIGIN`.
- No Cache Components or Partial Prefetching (a prerendered shell cannot carry the nonce); the root layout is `force-dynamic`.
- No Third-party scripts are limited to Razorpay Checkout and Sentry, and each new one needs a security review.

**Other headers** (set in `proxy.ts` and on CloudFront)

| Header | Value |
| --- | --- |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")` |
| Cross-Origin-Opener-Policy | `same-origin-allow-popups` (Razorpay opens a popup) |
| X-Powered-By | Removed (`poweredByHeader: false`) |

**XSS and injection**

- React escapes output by default. `dangerouslySetInnerHTML` is banned by lint, except one sanitizer wrapper (DOMPurify) for rich text, if we ever need it.
- User-generated text (posts, bios, messages) is plain text plus auto-linked URLs. Links get `rel="noopener noreferrer nofollow ugc"`, and only `https:` URLs are linked.
- `next/image` `remotePatterns` allows only our media CDN. User-supplied URLs are never put in `href` without a scheme check.
- Redirect targets (`?next=`) must be relative paths that start with `/` and not `//`.

**Cookies, CSRF and sessions**

- Tokens live only in `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` cookies set by the API. Nothing sensitive goes into localStorage or sessionStorage.
- State-changing requests send the CSRF token header, and the API also checks `Origin`.
- Signed-in pages send `Cache-Control: private, no-store`, so CloudFront and browsers never cache personal pages.

**Secrets and build**

- Only `NEXT_PUBLIC_*` values reach the browser, and those are public by design (API base, Sentry DSN, Razorpay key id). Server values are read only in `src/dal` and `server-only` modules.
- Production source maps are uploaded to Sentry and not served publicly (`productionBrowserSourceMaps: false`).
- Dependencies use the same rules as the API: frozen lockfile, Renovate, `pnpm audit`, CodeQL, and secret scanning. Next.js security patches ship within 48 hours, as we did for 16.4.2.

**Admin area (`/admin`)**

- Separate login at `/admin/login` that needs a password plus TOTP. Admin sessions last 8 hours with no refresh.
- Protected three times: the CloudFront WAF IP allow-list on `/admin*`, the `(admin)` layout check (`role === 'admin'`, otherwise 404), and the API's own admin guard on `/v1/admin/*`.
- KYC documents open through 5-minute links in a new tab, are never embedded or cached, and the page sends `Cache-Control: no-store`.
- Every admin page is `noindex` and excluded from the sitemap.

## SEO, performance and accessibility

Business, product and service pages are the growth channel, so they must be fast, indexable and shareable.

**SEO**

- `generateMetadata` on every public page: title, description, canonical URL, Open Graph and Twitter cards, with OG images generated per business and product.
- JSON-LD: `LocalBusiness` (or `Organization`) on business pages, `Product` with `Offer` on product pages, and `Service` on service pages.
- `sitemap.ts` (already scaffolded) is split by type and paginated from the API. `robots.ts` blocks `(app)` and `(auth)` routes, and those pages also send `noindex`.
- Clean slugs (`/business/sharma-textiles-surat`), and only published listings are indexed.

**Performance budgets** (75th percentile, mobile, measured on real users through Sentry and web-vitals)

- LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
- First-load JavaScript under 170 KB gzipped per public route. Heavy client pieces (chat, composer, charts) are loaded with `next/dynamic`.
- `next/image` with sized images and AVIF/WebP. Fonts through `next/font` with no layout shift.
- Lists stream with `Suspense` and loading skeletons (the `LoadingSkeleton` component already exists).

**Accessibility (WCAG 2.2 AA)**

- Semantic landmarks, one `h1` per page, and labelled form fields with errors announced through `aria-live`.
- Full keyboard support, including modals (focus trap, Esc to close) and the chat composer. Visible focus rings.
- Colour contrast at least 4.5:1, which needs checking against the current brand palette. `prefers-reduced-motion` is respected.
- axe checks run in Playwright on the core pages.

**Supported browsers:** the last 2 versions of Chrome, Edge, Firefox and Safari, plus Safari on iOS 16.4+ and Chrome on Android. Layouts are responsive from 360 px wide, and the existing `MobileNavigation` covers small screens. The UI is light theme only and English only, with all strings in message files.

## Testing and deployment

The web app ships as a Next.js `standalone` Docker container on the same EC2 server as the API, behind CloudFront. This replaces Amplify from the first draft. Every page is server-rendered for the nonce CSP, and a self-hosted container supports `proxy.ts` fully, with no extra hosting bill.

**Testing**

- Unit and component tests with Vitest and Testing Library for hooks, forms, the API client refresh logic and formatters.
- Playwright E2E against staging: sign up and OTP, the business onboarding wizard, create a product, post, follow, enquiry, chat between two browsers, the referral and withdrawal flow, Premium checkout in Razorpay test mode, and an admin approving a verification. Each run includes axe checks and a CSP-violation check (fail on any console CSP error).
- Lighthouse CI on the home, business and product pages, failing the build if the performance budgets above are missed.

**Deployment**

1. On a pull request: lint, type-check, unit tests and `next build`, plus a preview build against staging.
2. On merge to `main`: build the `standalone` image (Node 24 slim, non-root), scan it, push to ECR, deploy to staging, then run the Playwright suite.
3. Manual approval, then the same image goes to production with a health check on `/api/health`. Rollback means redeploying the previous tag.

- CloudFront behaviours: `/v1/*` and `/v1/ws` go to the API with no caching; `/_next/static/*` is cached immutably for 1 year; everything else goes to Next.js with no caching, and the cookies and headers are forwarded.
- Environment variables come from SSM at container start. Only `NEXT_PUBLIC_*` values are baked in at build time, so each environment gets its own build.
