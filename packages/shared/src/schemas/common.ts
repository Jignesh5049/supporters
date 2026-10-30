import { z } from 'zod';

/** Lower-case words joined by single hyphens, e.g. `asha-traders`. */
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Links shown on public pages: http(s) only, so a `javascript:` URL can never render. */
export const webUrlSchema = (max: number) =>
  z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(max);
