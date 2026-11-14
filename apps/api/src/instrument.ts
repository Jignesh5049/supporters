import { initSentry } from './lib/sentry';

// Preloaded with `node --import ./dist/instrument.js` so Sentry can instrument modules before they
// load (ES modules cannot be patched afterwards). It reads three variables on purpose, not
// loadEnv(): a bad environment is reported by the server itself, with a proper message.
// No DSN: no-op.
initSentry(
  {
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    NODE_ENV: process.env.NODE_ENV,
  },
  process.argv[1]?.endsWith('worker.js') ? 'worker' : 'api',
);
