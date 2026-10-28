/**
 * Writes the generated CSS files from src/tokens.ts.
 *   node scripts/generate-css.ts          write the files
 *   node scripts/generate-css.ts --check  fail if a committed file is stale (used in CI)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatedFiles } from '../src/css.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const stale: string[] = [];

for (const [file, build] of Object.entries(generatedFiles)) {
  const path = join(root, file);
  const expected = build();
  if (check) {
    let actual = '';
    try {
      actual = readFileSync(path, 'utf8');
    } catch {
      // Missing file counts as stale.
    }
    if (actual !== expected) stale.push(file);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, expected);
    console.log(`wrote ${file}`);
  }
}

if (stale.length > 0) {
  console.error(
    `Stale generated files: ${stale.join(', ')}. Run \`pnpm --filter @supporters/design-tokens generate\` and commit the result.`,
  );
  process.exit(1);
}
