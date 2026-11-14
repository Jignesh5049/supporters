# Contributing to Supporters

This guide is how we work: branches, commits, pull requests, naming and code standards. Read it before your first PR. The product and engineering specs live in [`docs/specs`](docs/specs/README.md).

## Local setup

The repo is a pnpm workspace:

```
apps/web        Next.js web app      (@supporters/web)
apps/mobile     Expo mobile app      (@supporters/mobile)
packages/shared limits, schemas, types shared by every app (@supporters/shared)
packages/design-tokens colours, radius, spacing, type for web and mobile (@supporters/design-tokens)
```

1. Install Node.js 24 LTS (the version is in `.nvmrc`).
2. Run `corepack enable` once, so the pnpm version pinned in `package.json` is used.
3. Run `pnpm install` at the repo root. Never run `npm install` inside an app.
4. Start an app with `pnpm dev:web` or `pnpm dev:mobile`.
5. Before pushing, run `pnpm format`, `pnpm lint`, `pnpm typecheck` and `pnpm test`, the same checks CI runs. Set your editor to format with Prettier on save.
6. Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once, so `git blame` skips bulk formatting commits.

Design tokens (colours, radius, spacing, type) live in `packages/design-tokens`. Change them only there, and see its README.

To add a dependency to one app, run `pnpm --filter @supporters/web add <pkg>`. To use a workspace package, add `"@supporters/shared": "workspace:*"`. pnpm blocks dependency install scripts: if a new package needs one, run `pnpm approve-builds <pkg>` and say why in the PR.

## Workflow

1. Pick a task from the board. Every task maps to a section of a spec; link it in your PR.
2. Branch from the latest `main`.
3. Commit in small, logical steps.
4. Open a pull request early (as a draft if it isn't ready).
5. CI must pass, and one reviewer must approve.
6. **Squash-merge** into `main`, then delete the branch.

`main` is protected: no direct pushes, no force pushes, and every change lands through a reviewed PR with green CI.

## Branch names

```
<type>/<scope>-<short-description>
```

| Part | Allowed values |
| --- | --- |
| `type` | `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build` |
| `scope` | `api`, `web`, `mobile`, `shared`, `tokens`, `ui-web`, `ui-native`, `infra`, `docs`, `repo`, `deps` (dependency updates, e.g. Dependabot) |
| `short-description` | 2 to 5 words, kebab-case |

Examples: `feat/api-otp-login`, `fix/web-feed-pagination`, `chore/repo-pnpm-workspace`, `ci/repo-github-actions`.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <summary>

<body: what changed and why, wrapped at 72 characters>

<footer: Refs #123, BREAKING CHANGE: ...>
```

- `type` and `scope` use the same lists as branch names.
- The summary is imperative, lower case, has no trailing period, and is 72 characters or fewer: `feat(api): add otp send and verify endpoints`.
- One logical change per commit. Don't mix formatting with behaviour changes.
- A breaking API or schema change needs a `BREAKING CHANGE:` footer.

## Pull requests

- **Title:** a Conventional Commit line, because it becomes the squash-commit message. CI checks it.
- **Size:** aim for under 400 changed lines (excluding lockfiles and generated code). Split bigger work into stacked PRs.
- **Description:** fill in the [PR template](.github/pull_request_template.md): what, why, the spec section, how it was tested, and screenshots or recordings for UI changes.
- **Review:** at least one approval. The author resolves every comment, either with a change or a reply. Re-request review after big changes.
- **Merge:** squash only, once CI is green and the branch is up to date with `main`.
- **Ownership:** the author merges their own PR after approval, and owns follow-up fixes.

## Naming conventions

### Files and folders

| What | Convention | Example |
| --- | --- | --- |
| Source files and folders | kebab-case | `business-card.tsx`, `use-feed.ts`, `otp.service.ts` |
| Framework-fixed names | as the framework requires | `page.tsx`, `layout.tsx`, `proxy.ts`, `_layout.tsx`, `[slug].tsx`, `(auth)/` |
| API module files | `<module>.<role>.ts` | `products.routes.ts`, `products.schemas.ts`, `products.service.ts` |
| Tests | beside the file, `.test.ts(x)` | `pagination.test.ts` |
| End-to-end tests | `e2e/<flow>.spec.ts` (web), `.maestro/<flow>.yaml` (mobile) | `e2e/enquiry.spec.ts` |

The prototype's PascalCase files (for example `BusinessCard.tsx`) are renamed to kebab-case when they are migrated.

### TypeScript

| What | Convention | Example |
| --- | --- | --- |
| Variables, functions | camelCase | `followerCount`, `sendOtp()` |
| React components, types, classes | PascalCase | `ProductCard`, `BusinessProfile` |
| Hooks | `use` + PascalCase | `useFeed`, `useSendMessage` |
| Event handlers / handler props | `handle` + Event / `on` + Event | `handleSubmit` / `onSubmit` |
| Booleans | `is`, `has`, `can`, `should` prefix | `isVerified`, `hasBusiness` |
| Constants and env vars | UPPER_SNAKE_CASE | `MAX_LISTING_IMAGES`, `DATABASE_URL` |
| Zod schemas / inferred types | `<name>Schema` / PascalCase | `createProductSchema` / `CreateProductInput` |
| Enumerations | `as const` objects or string unions, not TS `enum` | `PostStatus = { Draft: 'draft', ... } as const` |
| Interfaces | no `I` prefix | `Business`, not `IBusiness` |

### API (see the backend spec)

| What | Convention | Example |
| --- | --- | --- |
| Paths | plural nouns, kebab-case, versioned | `/v1/buyer-requirements/:id/quotes` |
| JSON fields and query params | camelCase | `amountPaise`, `?priceMin=` |
| Error codes | UPPER_SNAKE_CASE | `VALIDATION_FAILED`, `RATE_LIMITED` |
| Socket.IO events | `noun:verb` | `message:send`, `message:read` |
| Domain events | `entity.verb` (past tense) | `enquiry.created`, `payment.captured` |
| Queue names | kebab-case | `search-index`, `push` |

### Database (PostgreSQL via Prisma)

| What | Convention | Example |
| --- | --- | --- |
| Tables | snake_case, plural | `buyer_requirements` |
| Columns | snake_case | `owner_user_id` |
| Foreign keys | `<entity>_id` | `business_id` |
| Timestamps / booleans | `_at` suffix / `is_` prefix | `verified_at` / `is_hidden` |
| Indexes / unique constraints | `idx_<table>_<cols>` / `uq_<table>_<cols>` | `idx_posts_business_id_created_at` |
| Prisma models | PascalCase singular, mapped with `@@map` / `@map` | `model BuyerRequirement { ... @@map("buyer_requirements") }` |
| Migrations | Prisma timestamped folder plus a descriptive name | `20261101120000_add_reviews` |

### Other

- **Environment variables:** UPPER_SNAKE_CASE. Only `NEXT_PUBLIC_*` (web) and `EXPO_PUBLIC_*` (mobile) reach clients, and they must never hold secrets.
- **Release tags:** `api-vX.Y.Z`, `web-vX.Y.Z`, `mobile-vX.Y.Z` (semver).
- **Styling:** design tokens only. No hex colours or arbitrary Tailwind values in app code (see the UI system sections of the web and mobile specs).

## Code standards

- TypeScript `strict` everywhere. No `any`; use `unknown` and narrow it.
- Named exports only, except where a framework requires a default export (Next.js pages and layouts, Expo Router routes).
- UI comes from the shared libraries: `packages/ui-web` (shadcn/ui) on web and `packages/ui-native` (React Native Reusables) on mobile. Don't build a one-off button, input or dialog.
- Validate every input at the boundary with Zod schemas from `packages/shared`.
- Limits (lengths, counts, sizes, rates) come from `packages/shared/limits.ts`. Never hard-code them.
- Formatting is Prettier and linting is ESLint; both run in CI. Don't hand-format or disable rules without a comment explaining why.

## Security rules

- Never commit secrets, tokens, `.env` files or real customer data. Use SSM Parameter Store and `.env.example`.
- Every API route checks authentication, role and ownership, and has a test proving another user can't access it.
- Never log passwords, OTPs, tokens, phone numbers, emails or payout details.
- New dependencies need a reason in the PR description. Prefer well-maintained packages, and pin exact versions.
- Report a suspected vulnerability privately, never in a public issue: see [SECURITY.md](SECURITY.md).
- Security checks run in CI (CodeQL, gitleaks, `pnpm audit`, dependency review); keep them green. Pin every GitHub Action to a commit SHA. The ASVS and MASVS mapping is in [docs/security/checklist.md](docs/security/checklist.md).

## Definition of done

- [ ] Matches the linked spec section (or the spec is updated in the same PR)
- [ ] Tests added or updated, and CI is green
- [ ] Accessible: labels, keyboard and screen reader on web; accessibility labels and 44 pt targets on mobile
- [ ] No new lint warnings, `any`, or `console.log`
- [ ] Security rules above followed
- [ ] Docs or OpenAPI updated when behaviour changes
