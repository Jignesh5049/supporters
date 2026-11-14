import { setNonce } from 'get-nonce';
import { z } from 'zod';

/**
 * Runs in the browser before the app's own code, for two things the strict CSP needs.
 *
 * 1. Zod 4 probes `new Function('')` to decide whether it may compile schemas; with no
 *    `'unsafe-eval'` the probe throws, is caught, and is still reported as a violation. `jitless`
 *    skips the probe and the compiled fast path, which these small form schemas don't need.
 * 2. `react-style-singleton` (under Radix Dialog and Sheet, for the scroll lock) injects a
 *    `<style>` element and takes its nonce from `get-nonce`. Hand it the page's nonce, which
 *    Next put on its own scripts (the `nonce` property survives the attribute being hidden).
 */
z.config({ jitless: true });

const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
if (nonce) setNonce(nonce);
