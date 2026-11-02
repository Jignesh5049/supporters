const uiNative = require('@supporters/ui-native/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', uiNative.content],
  presets: [uiNative],
};
