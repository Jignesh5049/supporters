const uiNative = require('@supporters/ui-native/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}', uiNative.content],
  presets: [uiNative],
};
