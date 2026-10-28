/**
 * Tailwind 3 preset for apps that use @supporters/ui-native:
 * NativeWind's base preset plus the Supporters design tokens.
 *
 * Usage in an app's tailwind.config.js:
 *   presets: [require('@supporters/ui-native/tailwind-preset')],
 *   content: ['./app/**', './src/**', require('@supporters/ui-native/tailwind-preset').content]
 */
const path = require('node:path');
// Tailwind loads configs with jiti, which also compiles the TypeScript token source.
const { nativewindPreset } = require('@supporters/design-tokens');

module.exports = {
  presets: [require('nativewind/preset'), nativewindPreset],
  // v1 is light theme only: dark: styles apply under an explicit class, not the OS setting.
  darkMode: 'class',
  /**
   * Glob for the library's own source, so its classes are generated.
   * Forward slashes: Tailwind's glob matcher ignores Windows backslash paths.
   */
  content: path.join(__dirname, 'src/**/*.{ts,tsx}').replaceAll('\\', '/'),
};
