module.exports = function (api) {
  api.cache(true);
  return {
    // Jest only: the mobile app compiles className with NativeWind. Without its JSX
    // import source, className stays a plain prop that tests can assert on.
    presets: ['babel-preset-expo'],
  };
};
