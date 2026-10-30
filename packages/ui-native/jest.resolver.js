const reanimatedResolver = require('react-native-reanimated/jest/resolver');

// Reanimated's resolver loads the JS builds of files inside react-native-worklets by checking
// `basedir.includes('react-native-worklets')`. pnpm names store folders after a package's peers
// (react-native-reanimated@4.7.1_react-native-worklets@0.13.0_...), so on Linux every Reanimated
// file matched. Hide the store folder name from that check, and resolve from the real basedir.
module.exports = (request, options) => {
  const { basedir, defaultResolver } = options;
  return reanimatedResolver(request, {
    ...options,
    basedir: basedir.replace(/([\/]\.pnpm[\/])[^\/]+/, '$1_'),
    defaultResolver: (req, resolverOptions) =>
      defaultResolver(req, { ...resolverOptions, basedir }),
  });
};
