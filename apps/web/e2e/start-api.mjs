// Starts the local API for Playwright and copies its stdout to a file, so tests can read
// the `[dev sms]` OTP lines that the API's console SMS sender prints.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const logPath = process.argv[2];
mkdirSync(dirname(logPath), { recursive: true });
const log = createWriteStream(logPath, { flags: 'w' });
const apiDir = fileURLToPath(new URL('../../api', import.meta.url));

const child = spawn(process.execPath, ['--env-file=.env', '--import', 'tsx', 'src/server.ts'], {
  cwd: apiDir,
  stdio: ['ignore', 'pipe', 'inherit'],
});
child.stdout.on('data', (chunk) => {
  log.write(chunk);
  process.stdout.write(chunk);
});
child.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
