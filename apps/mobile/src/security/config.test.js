/* eslint-env node, jest */
// Plain JS on purpose: it reads the checked-in config with Node's fs, and the mobile TypeScript
// project has no Node types.
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

/**
 * MASVS guards that fail the build if someone loosens a release setting or adds a risky
 * dependency. They read the checked-in config, so they need no device.
 */
const root = join(__dirname, '..', '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const appJson = JSON.parse(read('app.json'));
const pkg = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));

function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}
const appSources = [...sources(join(root, 'src')), ...sources(join(root, 'app'))];

/** Files whose text matches `pattern`, so a failure names them. */
const offenders = (pattern, only = () => true) =>
  appSources.filter((file) => only(file) && pattern.test(readFileSync(file, 'utf8')));

describe('Android release settings', () => {
  it('turns app backup off, so private data never leaves the device through cloud backup', () => {
    expect(appJson.expo.android.allowBackup).toBe(false);
  });

  it('disables cleartext traffic and enables minify and resource shrinking in release', () => {
    const plugin = appJson.expo.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-build-properties',
    );
    expect(plugin?.[1].android).toMatchObject({
      usesCleartextTraffic: false,
      enableMinifyInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
    });
  });

  it('requests only the permissions the app uses, and blocks broad storage access', () => {
    expect([...appJson.expo.android.permissions].sort()).toEqual([
      'CAMERA',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
    ]);
    expect(appJson.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining(['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']),
    );
  });
});

describe('transport', () => {
  it('points every non-development EAS profile at https', () => {
    const insecure = Object.entries(eas.build)
      .filter(([name]) => name !== 'development')
      .filter(([, profile]) => !/^https:\/\//.test(profile.env?.EXPO_PUBLIC_API_URL ?? ''))
      .map(([name]) => name);
    expect(insecure).toEqual([]);
  });
});

describe('attack surface', () => {
  it('has no WebView, so no injected-script or file-access surface', () => {
    expect(Object.keys(pkg.dependencies).filter((name) => /webview/i.test(name))).toEqual([]);
    expect(offenders(/react-native-webview|<WebView/)).toEqual([]);
  });

  it('keeps tokens out of AsyncStorage and plain MMKV', () => {
    expect(Object.keys(pkg.dependencies)).not.toContain(
      '@react-native-async-storage/async-storage',
    );
    expect(offenders(/async-storage/)).toEqual([]);
    // MMKV is only opened by the encrypted wrapper (AES-256, key in SecureStore).
    expect(
      offenders(
        /createMMKV|new MMKV/,
        (file) => !file.endsWith(join('storage', 'encrypted-storage.ts')),
      ),
    ).toEqual([]);
  });

  it('never logs tokens, passwords or codes', () => {
    const bad = [];
    for (const file of appSources) {
      const calls =
        readFileSync(file, 'utf8').match(/console\.(log|debug|info|warn|error)\([^)]*\)/g) ?? [];
      for (const call of calls) {
        if (/token|password|otp|secret|authorization/i.test(call)) bad.push(`${file}: ${call}`);
      }
    }
    // Allowed: the push-token *registration failure* message, which logs the error, not a token.
    expect(bad.filter((line) => !/Failed to obtain push token/.test(line))).toEqual([]);
  });

  it('opens external links only through the vetted helpers', () => {
    // Allowed: a vetted `website` (safeWebUrl), a signed attachment URL, a tel: built from digits
    // only, and the fixed Play Store link.
    const allowedStarts = [
      'website)',
      'website.',
      'fresh)',
      "`tel:${phone.replace(/[^\\d+]/g, '')}`",
      '`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`',
    ];
    const allowed = { test: (rest) => allowedStarts.some((start) => rest.startsWith(start)) };
    const bad = [];
    for (const file of appSources) {
      const text = readFileSync(file, 'utf8');
      for (const [, rest = ''] of text.matchAll(/Linking\.openURL\((.*)/g)) {
        if (!allowed.test(rest)) bad.push(file + ': ' + rest);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('sensitive screens', () => {
  it.each([
    'src/screens/HubVerificationScreen.tsx',
    'src/screens/WalletScreen.tsx',
    'src/screens/WithdrawalScreen.tsx',
    'src/screens/otp-verify-screen.tsx',
  ])('%s blocks screenshots and recording (FLAG_SECURE)', (file) => {
    expect(read(file)).toMatch(/useScreenSecurity\(/);
  });
});
