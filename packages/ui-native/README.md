# @supporters/ui-native

Shared React Native components for `apps/mobile`, from [React Native Reusables](https://reactnativereusables.com) (the shadcn/ui port for React Native) on NativeWind 4 and the Supporters design tokens. Component names and variants match `@supporters/ui-web`.

## Use in an app

The mobile app is already set up. A new app needs:

1. Dependencies: `@supporters/ui-native`, `nativewind`, `react-native-css-interop`, `react-native-reanimated`, `react-native-worklets`, `react-native-screens`, `react-native-svg`, `@rn-primitives/portal`, plus `tailwindcss@3` and `babel-preset-expo` as dev dependencies.
2. `tailwind.config.js`:
   ```js
   const uiNative = require('@supporters/ui-native/tailwind-preset');
   module.exports = { content: ['./app/**/*.{ts,tsx}', uiNative.content], presets: [uiNative] };
   ```
3. A `global.css` with the three `@tailwind` directives, imported once at the root.
4. `babel.config.js` with `['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'`, and `metro.config.js` wrapped in `withNativeWind(config, { input: './global.css' })`.
5. `<PortalHost />` from `@rn-primitives/portal` at the root, after the app tree. Dialogs render into it.

Then import components by path: `import { Button } from '@supporters/ui-native/components/button'`.

## Adding a component

Run this from `packages/ui-native`, with the component name from the RNR docs:

```
pnpm dlx shadcn@latest add https://reactnativereusables.com/r/nativewind/<name>.json
```

Then pin any new `@rn-primitives/*` dependency to an exact version in `package.json`, and use token classes for colours (for example `text-destructive-foreground`, not `text-white`).

> Keep `"cssVariables": true` in `components.json`. With `false`, the CLI inlines shadcn's neutral palette (`bg-oklch(...)`) instead of keeping the token class names, and those classes don't work.

## Notes

- Colours come from `nativewindPreset` in `@supporters/design-tokens`, as raw values, because React Native has no CSS variables at runtime. Opacity modifiers like `bg-primary/90` work.
- v1 is light theme only: `darkMode: 'class'`, and no `.dark` class is ever set.
- Component tests run on Jest (`jest-expo`) with React Native Testing Library: `pnpm --filter @supporters/ui-native test`. Jest uses this package's `babel.config.js`, which leaves out NativeWind so tests can assert on `className`.
