const expoPreset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // @rn-primitives ships untranspiled JSX, so Jest has to transform it too.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace('(?!(.pnpm|', '(?!(.pnpm|@rn-primitives|'),
  ),
  // Loads the JS (web) builds of Reanimated and worklets, which run without native code.
  resolver: '<rootDir>/jest.resolver.js',
  moduleNameMapper: {
    '^@supporters/ui-native/(.*)$': '<rootDir>/src/$1',
    // The "react-native" export condition points at an .mjs build Jest can't load.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
