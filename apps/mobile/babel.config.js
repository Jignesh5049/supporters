module.exports = function (api) {
  const isProd = api.env('production');
  api.cache(true);
  return {
    // NativeWind compiles className props; babel-preset-expo adds the worklets plugin for Reanimated.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // Mobile spec line 155: No console.log in release builds
      ...(isProd ? ['transform-remove-console'] : []),
    ],
  };
};
