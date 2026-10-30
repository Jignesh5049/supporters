import { colors, fontFamily, fontWeight, radius, spacing, typeScale } from './tokens.ts';

const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/**
 * Tailwind 3 preset for NativeWind (mobile). Uses raw values, because React
 * Native has no CSS variables at runtime. Web uses the generated CSS instead.
 *
 * Usage in apps/mobile/tailwind.config.js:
 *   presets: [require('nativewind/preset'), nativewindPreset]
 */
export const nativewindPreset = {
  theme: {
    extend: {
      colors: Object.fromEntries(
        Object.entries(colors).map(([name, value]) => [kebab(name), value]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([name, value]) => [name, `${value}px`]),
      ),
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([name, value]) => [name, `${value}px`]),
      ),
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([name, [size, lineHeight]]) => [
          name,
          [`${size}px`, { lineHeight: `${lineHeight}px` }],
        ]),
      ),
      fontWeight: Object.fromEntries(
        Object.entries(fontWeight).map(([name, value]) => [name, String(value)]),
      ),
      fontFamily: { sans: [fontFamily.sans], mono: [fontFamily.mono] },
    },
  },
} as const;
