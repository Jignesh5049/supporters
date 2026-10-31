# Supporters - React Native Mobile App

This is the React Native (Expo) mobile application for **Supporters** — Social Commerce & Business Discovery Platform.

It faithfully converts the web application's mobile phone view into a native mobile app experience with zero UI compromises:
- **Mobile Header**: Supporters monogram logo, search shortcut, notifications bell badge, and user avatar.
- **Side Drawer Menu**: Fast navigation across profile, workspace, saved collection, growth, referral, and settings.
- **Home Feed**: Real-time search bar, horizontal category pills scroller, quick post update widget, and full interactive social commerce feed cards with likes, comments, shares, saves, and RFQ quotation requests.
- **Discover Directory**: City selector (Ahmedabad, Surat, Vadodara, Mumbai, etc.), tabs for Products, Services, and Verified Businesses.
- **Direct Messaging & Chat**: RFQ message threads with instant replies and product card attachments.
- **Interactive Modals**:
  - Center floating action button **(+) Create Listing** bottom sheet (Product, Service, Update, Offer).
  - **Quotation / Enquiry Modal** ("Contact Supplier").
  - **Share Modal** (WhatsApp, LinkedIn, Copy Link).
  - In-app animated **Toast** alerts.

---

## 📁 Mock Data Architecture (`mock.ts`)

All mock data is centralized in:
- [`mock.ts`](file:///d:/Suppoertrs%20-%20App/mobile/mock.ts) (root of `mobile/`)
- [`src/mock.ts`](file:///d:/Suppoertrs%20-%20App/mobile/src/mock.ts) (re-exports for convenience)

### How to change to real backend data:
When you are ready to connect to your real backend (REST API, GraphQL, Supabase, Firebase, or Node/Express):
1. Open [`mock.ts`](file:///d:/Suppoertrs%20-%20App/mobile/mock.ts).
2. The TypeScript interfaces (`Product`, `Service`, `Business`, `FeedPost`, `Conversation`, `NotificationItem`, `UserProfile`) match your backend schema.
3. Replace the exported constants (`MOCK_POSTS`, `MOCK_PRODUCTS`, etc.) or update [`src/context/AppContext.tsx`](file:///d:/Suppoertrs%20-%20App/mobile/src/context/AppContext.tsx) to fetch from your API `fetch('https://api.supporters.in/posts')` inside `useEffect`.

---

## 🧭 Navigation (Expo Router)

Routes live in `src/app/` (file-based, typed routes); screen UI lives in `src/features/<feature>/`.

- `src/app/_layout.tsx` holds the providers (Query, SafeArea, AppContext) and `<PortalHost />`. `src/features/navigation/app-shell.tsx` adds the 426 gate, the session-restore spinner and the overlays.
- **Guests** can open Home, Discover, `business/[slug]` and `product/[id]`. Every other screen sits under `Stack.Protected` / `Tabs.Protected` (`src/features/navigation`): a deep link to one opens sign-in, and in-app taps show "Sign in to continue". The guard lists are in `src/lib/navigation/routes.ts`.
- **Deep links:** `supporters://business/<slug>`, `supporters://product/<id>`, `supporters://messages/<id>`, and so on. Route params are validated with Zod (`src/lib/navigation/params.ts`). Android App Links and iOS Universal Links are added by `app.config.ts` when `APP_LINK_DOMAIN` is set (TODO: set it once the domain exists).
- Try a link on a running Android dev build: `adb shell am start -a android.intent.action.VIEW -d supporters://product/p-1`.

---

## 🚀 Running the App Locally

### 1. Start the Expo Dev Server
Navigate into the `mobile` folder:
```bash
cd mobile
npx expo start
```

### 2. View on Your Device or Emulator
- **Physical Phone**: Install the **Expo Go** app from Google Play Store or iOS App Store, then scan the QR code displayed in the terminal.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator** (macOS only): Press `i` in the terminal.
- **Web Preview**: Press `w` in the terminal.
