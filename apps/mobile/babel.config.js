module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind compiles className props; babel-preset-expo adds the worklets plugin for Reanimated.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
