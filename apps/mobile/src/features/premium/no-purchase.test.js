/* eslint-env node, jest */
// Plain JS on purpose (reads source with Node's fs). Premium is bought on the web only, because
// Google Play and App Store billing rules cover digital subscriptions sold in an app. These checks
// fail the build if a purchase path, a price or a checkout link ever appears in the app.
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', '..', '..');
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}
const text = (file) => readFileSync(file, 'utf8');
/** Code without comment lines: the comments may name what the code must not do. */
const code = (file) =>
  text(file)
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
const premiumFiles = [
  join(root, 'app', 'hub', 'premium.tsx'),
  join(root, 'src', 'screens', 'SubscriptionScreen.tsx'),
  join(root, 'src', 'lib', 'api', 'premium.ts'),
  ...sources(join(root, 'src', 'features', 'premium')),
];

describe('Premium is status-only in the app', () => {
  it('has no price, purchase wording, checkout link or payment SDK in the Premium files', () => {
    const banned =
      /₹|\bINR\b|amountPaise|price|\bbuy\b|purchase|subscribe\b|upgrade|checkout|razorpay|https?:\/\/|Linking|openURL|WebView/i;
    const hits = premiumFiles.flatMap((file) => {
      const match = code(file).match(banned)?.[0];
      return match ? [`${file}: ${match}`] : [];
    });
    expect(hits).toEqual([]);
  });

  it('exposes only a status read in the Premium API', () => {
    const api = code(join(root, 'src', 'lib', 'api', 'premium.ts'));
    expect(api).toContain("'/me/business/premium'");
    expect(api).not.toMatch(/method:\s*'(POST|PUT|PATCH|DELETE)'/);
    expect(api).not.toMatch(/checkout|cancel|invoices/);
  });

  it('has no payment SDK among the dependencies', () => {
    const pkg = JSON.parse(text(join(root, 'package.json')));
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter((name) => /razorpay|stripe|billing|iap|purchases/i.test(name))).toEqual([]);
  });
});
