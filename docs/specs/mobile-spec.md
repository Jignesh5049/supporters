# Supporters — Mobile App Spec (React Native + Expo)

Oct 28, 2026 · @The velnix

The app migrates the existing Expo prototype in `mobile/` from mock data to the real API in [backend-spec.md](backend-spec.md); product scope lives in [product-spec.md](product-spec.md).

## Stack and versions

We upgrade the prototype from Expo SDK 57 / React Native 0.86 to **Expo SDK 58 / React Native 0.88**, the latest stable pair as of 28 Oct 2026. Library versions follow Expo's bundled list, so `npx expo install --check` stays green.

| Layer                  | Choice                                                     | Version                   | Notes                                                             |
| ---------------------- | ---------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| SDK                    | Expo (managed workflow, Continuous Native Generation)      | 58.0.x                    | No ejected native folders in git                                  |
| Runtime                | React Native (New Architecture, Hermes) / React            | 0.88.1 / 19.3.0           | Pinned by SDK 58                                                  |
| Language               | TypeScript, strict                                         | 6.0.x                     | Expo's tested version. Moves to TS 7 when Expo supports it        |
| Navigation             | Expo Router (file-based, typed routes)                     | \~58.0.27                 | Replaces today's hand-rolled screen switching in `App.tsx`        |
| Server state           | TanStack Query                                             | 5.105.x                   | Caching, retries, infinite lists, optimistic likes                |
| Client state           | Zustand                                                    | 5.0.x                     | Session and UI state only. Replaces the single large `AppContext` |
| Forms                  | react-hook-form + Zod (from `packages/shared`)             | 7.91 / 4.6                | Same validation as the API                                        |
| Lists                  | @shopify/flash-list                                        | 2.3.x                     | Feed, chat, search results                                        |
| Images                 | expo-image                                                 | \~58.0.17                 | Disk cache, blurhash placeholders                                 |
| Animation and gestures | Reanimated + Gesture Handler                               | 4.7.1 / \~3.3             |                                                                   |
| Secure storage         | expo-secure-store                                          | \~58.0.2                  | Android Keystore and iOS Keychain                                 |
| Biometrics             | expo-local-authentication                                  | \~58.0.2                  | Optional app lock, and confirming withdrawals                     |
| Push                   | expo-notifications                                         | \~58.1.6                  | Expo Push through FCM and APNs                                    |
| Media                  | expo-image-picker + expo-image-manipulator                 | \~58.0.x                  | Compress before upload                                            |
| Realtime               | socket.io-client                                           | 4.8.x                     | Matches the server                                                |
| Updates                | expo-updates (EAS Update)                                  | \~58.0.18                 | Signed OTA updates for JS-only fixes                              |
| Errors                 | @sentry/react-native                                       | \~8.28.0 (SDK 58 bundled) | Crash and performance monitoring                                  |
| Tests                  | jest-expo + @testing-library/react-native, Maestro for E2E | 58.0.x / 14.1 / 2.1       |                                                                   |

Also in use: react-native-mmkv 4.3.x (encrypted query cache), expo-screen-capture \~58.0.6, expo-image-manipulator \~58.0.15, and expo-image-picker \~58.0.10. The app lives in the pnpm workspace as `apps/mobile` and imports types, Zod schemas and limits from `packages/shared`. Always add native libraries with `npx expo install` so versions match SDK 58.

## Structure, navigation and screens

The 22 prototype screens move into Expo Router routes. Screens over 400 lines get split into feature components, which matters because today the largest runs to 1,348 lines.

```
apps/mobile/
  app/
    _layout.tsx              # providers: Query, Session, Theme, Sentry; push + deep-link handlers
    (auth)/sign-in.tsx  sign-up.tsx  verify-otp.tsx  forgot-password.tsx  reset-password.tsx  onboarding.tsx
    (tabs)/_layout.tsx       # bottom tabs: Home, Discover, Create, Messages, Profile
    (tabs)/index.tsx  discover.tsx  create.tsx  messages/index.tsx  profile.tsx
    business/[slug].tsx      # tabs: Products, Services, Posts, Reviews
    product/[id].tsx  service/[id].tsx  post/[id].tsx  search.tsx
    messages/[conversationId].tsx  notifications.tsx  saved.tsx
    requirements/index.tsx  requirements/new.tsx  requirements/[id].tsx
    hub/index.tsx  hub/edit.tsx  hub/products.tsx  hub/services.tsx  hub/posts.tsx
    hub/enquiries.tsx  hub/verification.tsx  hub/premium.tsx  hub/analytics.tsx  hub/settings.tsx
    wallet/index.tsx  wallet/withdraw.tsx  wallet/history.tsx  referral.tsx  settings.tsx
  src/
    features/<feature>/      # components, hooks (useFeed, useSendMessage), api calls
    lib/api/                 # fetch client, auth refresh, error mapping
    lib/socket/  lib/push/  lib/storage/  lib/attest/
    ui/                      # design system: Button, Avatar, Badge, Sheet, Toast, theme tokens
```

- **Guest access:** Home, Discover, search, and business, product, service and post screens work without signing in. Like, follow, save, comment, message, enquiry, create and profile open a sign-in sheet, then continue the action afterwards.
- **Protected routes:** Messages, Notifications, Saved, Requirements, Wallet, Referral and Settings need a session. `hub/*` also needs a business, and otherwise shows "Create your business".
- **Deep links:** scheme `supporters://`, plus Android App Links and iOS Universal Links on `https://<domain>`. They open business, product, service, post, chat and requirement routes. Shared links and push taps use the same paths.
- **Premium:** `hub/premium` shows status, expiry and perks only. There is no buy button, price or link to the web checkout, to comply with Google Play and App Store billing rules (main spec, decision 10).
- **Layout:** phone and portrait only (`supportsTablet: false`), light theme only, English strings in message files.

| Screen area                         | Prototype today        | Work left                                                                                     |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| Sign in, sign up, forgot password   | Done (mock auth)       | OTP verify screen, reset password, wire to API                                                |
| Home feed, create post              | Done                   | Infinite feed, comments sheet, video upload                                                   |
| Discover, search                    | Done (local filter)    | Server search, filters, buyer requirements list and form                                      |
| Business page, product detail       | Done                   | Service detail screen, reviews, follow and save on the API                                    |
| Messages                            | Static list and thread | Socket.IO realtime, attachments, read receipts                                                |
| Notifications                       | Done (mock)            | API list, push, deep-link taps                                                                |
| Business Hub, edit, posts, settings | Done                   | Products and services CRUD screens, enquiry inbox                                             |
| Wallet, withdraw, history, referral | Done                   | API wiring, biometric confirm on withdraw                                                     |
| Subscription                        | Done                   | Status-only Premium screen; remove the prototype's subscribe button (no purchases in the app) |
| Settings, saved, profile            | Done                   | Session list, notification preferences, account delete                                        |

## UI system

All mobile UI is built from one shared library, `packages/ui-native`, based on **React Native Reusables** (the shadcn/ui port for React Native, CLI 0.7.1) on **NativeWind 4.2.7** and `@rn-primitives` 1.5. Component names, variants and sizes match `packages/ui-web`, so a design reads the same on both platforms.

```
packages/
  design-tokens/   # shared with web: tokens.ts is the single source of colours, radius, spacing, type
  ui-native/
    tailwind-preset.js   # NativeWind preset + design tokens, used by the app's tailwind.config.js
    src/components/      # button.tsx, input.tsx, card.tsx, dialog.tsx, sheet.tsx, tabs.tsx, ...
    src/patterns/        # BusinessCard, ProductCard, FeedPostCard, EmptyState, ...
    src/lib/utils.ts     # cn(): clsx + tailwind-merge
```

- **Adding a component:** inside `packages/ui-native`, run `pnpm dlx shadcn@latest add https://reactnativereusables.com/r/nativewind/<name>.json` (the RNR CLI expects an app, not a library), then pin new dependencies and align colours to tokens. Keep `"cssVariables": true` in `components.json`; see the package README.
- **Version note:** NativeWind 4.2.7 is the latest stable release and runs on Tailwind CSS **3.4.19**, while web uses Tailwind 4.3. Both read the same values from `design-tokens/tokens.ts`, so they stay in sync. We move mobile to NativeWind 5 (Tailwind 4) once it leaves release candidate.
- **Variants** use `class-variance-authority` 0.7 with the same names as web: `variant` (default, secondary, outline, ghost, destructive, link) and `size` (default, sm, lg, icon).
- **Icons** come from `lucide-react-native` 1.63, the same icon set as web's `lucide-react`. The prototype's `@expo/vector-icons` are replaced.
- **Rules:** no inline `StyleSheet` colours or hex values in app code (lint-enforced), and touch targets of at least 44 × 44 pt are built into the components. The prototype's `src/styles/theme.ts` is replaced by design-tokens.

## Data layer

All server data goes through TanStack Query hooks built on one typed API client. Screens never call `fetch` directly, and no mock data ships in release builds.

**API client (`src/lib/api`)**

- The base URL is `EXPO_PUBLIC_API_URL` per build profile (`https://staging.<domain>/v1` or `https://<domain>/v1`), HTTPS only.
- Every request sends `X-Client: mobile`, `X-App-Version` and `Authorization: Bearer <access>`. A `426 Upgrade Required` opens a blocking "Update the app" screen that links to the store.
- On a 401, the client runs **one** shared refresh call (concurrent requests wait for it), stores the rotated tokens, and retries once. If the refresh fails, it signs the user out. The API's 10-second grace window covers a refresh racing an app restart.
- Responses are parsed with the shared Zod schemas. Errors map from the problem-details `code` to user-facing messages, and raw server text is never shown.
- Writes the API marks as idempotent send an `Idempotency-Key` (a UUID generated once per user action and reused on retry).

**Auth flow**

1. **Sign-up:** name, +91 mobile number, password and an optional referral code. Then `POST /auth/otp/send {purpose: signup}`, the OTP screen (SMS autofill on Android, one-time-code on iOS), then `POST /auth/register` with the OTP. That returns tokens, which go to SecureStore, and the session goes into Zustand. Then onboarding (city and interests).
2. **Sign-in:** mobile number or email plus password, then the same token storage.
3. **Cold start:** read SecureStore. With a refresh token, refresh silently before the first authenticated call. Without one, the app opens in guest mode.
4. **Sign-out:** call `/auth/logout`, delete this device's push token, then wipe SecureStore, the MMKV cache and the Query cache.

**Caching and offline**

- Query cache defaults: `staleTime` 30 s for feeds and 5 min for profiles and categories. Infinite queries use cursors.
- Feed, conversations and notifications are persisted to disk with the Query persister (MMKV), so the app opens instantly and works read-only offline. Private data is cleared on sign out.
- Optimistic updates for like, save, follow and send message, rolled back on error.

**Realtime**

- One Socket.IO connection to `/v1/ws` while the app is in the foreground and signed in, with the access token in `auth.token`. After each token refresh, the app emits `auth:renew` with the new token. It disconnects when the app goes to the background, and push takes over.
- Incoming `message:new` events update the conversation's Query cache directly. Unsent messages queue locally (MMKV) and retry with the same `clientId` on reconnect. Missed messages load with `?after=<lastId>`.

**Push notifications**

- Ask for permission at a moment that makes sense (after the first DM or enquiry), not on first launch. Register the Expo push token with `POST /me/push-tokens`.
- Android channels: Messages, Enquiries, Activity, Account. A tap deep-links through Expo Router.
- Notification payloads carry ids only, with no message text or PII. The app fetches the details after it opens.

**Media uploads**

- **Images:** pick, convert HEIC to JPEG, resize so the longest side is 2048 px, compress at quality 0.8, then strip EXIF (the server does it again). Then `POST /uploads/presign`, upload with a progress bar, and `POST /uploads/:id/complete`.
- **Video** (posts only): pick, check it is 60 s or shorter and 100 MB or smaller before uploading, then upload the same way.
- **Documents** (chat, KYC): PDF only, up to 10 MB.
- Limits come from `packages/shared/limits.ts`, the same values the API enforces.

## Security

The mobile standard is OWASP MASVS 2.x (L1, plus L2 controls for auth and money). The app holds no secrets: every rule that matters is enforced by the API, and the app only adds defence in depth.

| Area                  | Rule                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token storage         | Access and refresh tokens go in expo-secure-store with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Never in AsyncStorage, MMKV, logs or Redux-style dev tools                                    |
| Cached data           | The MMKV cache is encrypted with a random key kept in SecureStore, and wiped on sign out                                                                                                                   |
| Secrets in the bundle | None. `EXPO_PUBLIC_*` variables hold public values only (API URL, Sentry DSN, Razorpay key id). Keys and secrets stay on the server                                                                        |
| Transport             | HTTPS only. Android `usesCleartextTraffic=false` with a network security config, and iOS ATS left on. Certificate pinning is skipped in v1 because rotation would break old installs; revisit after launch |
| Auth UX               | The OTP field uses one-time-code autofill. Biometric confirmation before a withdrawal or a payout-details change. Optional app lock                                                                        |
| Deep links            | Verified App Links and Universal Links. Every route param is validated with Zod, and links never perform an action without a user tap                                                                      |
| WebViews              | Only for Razorpay checkout and legal pages. The origin is allow-listed, `javascriptEnabled` is on only where needed, and there is no `injectedJavaScript` that touches tokens                              |
| Screenshots           | `FLAG_SECURE` (expo-screen-capture) on the wallet, withdraw and OTP screens                                                                                                                                |
| Logging               | No `console.log` in release builds (Babel transform). Sentry scrubs tokens, phone numbers and payout fields before sending                                                                                 |
| Clipboard             | The referral code may be copied. OTPs and tokens are never written to the clipboard                                                                                                                        |
| Release hardening     | Hermes bytecode, Android R8 minification, `debuggable=false`, no dev menu, and Google Play Integrity / App Attest checks on sign-up and withdrawal (verified server-side)                                  |
| Permissions           | Ask only for camera, photos and notifications, each when it is first needed. No contacts or location access in v1                                                                                          |
| Updates               | EAS Update code signing is on, so the app rejects any unsigned OTA bundle                                                                                                                                  |
| Dependencies          | Lockfile committed, `expo install --check` in CI, Renovate updates, and `pnpm audit` gating merges                                                                                                         |

## Performance, accessibility and testing

The app supports Android 7.0+ (API 24, the Expo SDK 58 minimum, targeting API 36) and iOS 16.4+. Performance is tuned and measured on mid-range Android phones with 3 to 4 GB RAM running Android 10 or later, which is most of the Indian market.

**Performance budgets**

- Cold start under 2.5 s to first feed render on a mid-range Android device (measured with a release build).
- 60 fps scroll on the feed and chat: FlashList with stable keys, memoized rows, and images sized to the cell through expo-image.
- Release APK under 40 MB per architecture (App Bundle splits).
- No request waterfalls on a screen: data loads in parallel or is prefetched on press-in.

**Accessibility**

- Every touchable has an `accessibilityLabel` and role, and targets are at least 44 × 44 pt.
- Dynamic font scaling is supported up to 200%, and text contrast meets WCAG AA.
- Screen reader passes with TalkBack and VoiceOver on the core flows: sign up, feed, business page, enquiry and chat.

**Testing**

- Unit and component tests with jest-expo and React Native Testing Library for hooks, forms and the API client refresh logic.
- Maestro E2E flows on the staging API, run in CI on an Android emulator: sign up and OTP, follow a business, send an enquiry, DM, create a post, and request a withdrawal.
- Manual QA matrix before release: one low-end Android, one mid-range Android, and one iPhone.

## Build and release

EAS Build produces every binary and EAS Update ships signed JavaScript-only fixes. Android goes to the Play Store first; iOS follows once the client confirms it.

| Profile       | Build                    | API              | Distribution                                                               |
| ------------- | ------------------------ | ---------------- | -------------------------------------------------------------------------- |
| `development` | Dev client               | Local or staging | Team devices                                                               |
| `preview`     | Release APK              | Staging          | Internal testers through EAS internal distribution                         |
| `production`  | AAB (Android), IPA (iOS) | Production       | Play Store (internal → closed → production tracks), TestFlight → App Store |

- App identity: Android package `com.supporters.app` (already set) and iOS bundle id `com.supporters.app`. Signing credentials are managed by EAS and never stored in git.
- Versioning: semver `version` for users, with `runtimeVersion` from the fingerprint policy so OTA updates only reach compatible binaries.
- OTA rules: JS and asset fixes only. Anything that touches native modules, permissions or the SDK needs a new store build. Roll out at 10%, then 50%, then 100%, watching Sentry crash-free sessions (target 99.5% or higher).
- Store readiness: privacy policy URL, a Play Data Safety form and an iOS privacy manifest that match the data we actually collect, an in-app account deletion link (required by both stores), and Android targetSdk 36 (the Expo SDK 58 default).
- CI (GitHub Actions): lint, type-check and unit tests on every pull request. Merging to `main` triggers an EAS `preview` build plus Maestro. Tagging `mobile-v*` triggers a `production` build and submission.
