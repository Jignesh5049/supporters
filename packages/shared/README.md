# @supporters/shared

Code shared by the API, web and mobile apps: limits today, then Zod schemas, types and enums as Phase 1 adds them.

- Source is TypeScript, consumed directly (no build step). Next.js compiles it through `transpilePackages`, Metro compiles it natively, and the API uses it at build time.
- Add it to an app with `"@supporters/shared": "workspace:*"`.
- Every limit in the specs lives in `src/limits.ts`. Change a value here, never in an app.
