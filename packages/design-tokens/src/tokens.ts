/**
 * Supporters design tokens: the single source of truth for colour,
 * radius, spacing, type, shadow and layering on web and mobile.
 *
 * - Web: generated CSS variables (css/tokens.css) mapped into Tailwind 4.
 * - Mobile: the NativeWind (Tailwind 3) preset in tailwind-preset.ts.
 *
 * Colour names follow shadcn/ui (`background`, `primary`, `muted`, ...) so
 * components from shadcn/ui and React Native Reusables work unchanged.
 * Every text/background pair is contrast-tested (WCAG 2.2 AA) in tokens.test.ts.
 */

/** Raw brand palette from the prototype. App code uses `colors`, never this. */
export const palette = {
  indigo700: '#242775',
  indigo600: '#2E3192',
  indigo50: '#EEF0FA',
  cyan500: '#00AEEF',
  cyan50: '#E0F7FE',
  magenta600: '#A3238E',
  magenta700: '#8E1C7B',
  magenta50: '#FDF2F8',
  green700: '#047857',
  green50: '#ECFDF5',
  amber500: '#F59E0B',
  amber50: '#FEF3C7',
  red600: '#DC2626',
  red50: '#FEE2E2',
  ink: '#111111',
  slate500: '#667085',
  gray400: '#9CA3AF',
  gray200: '#E5E7EB',
  gray100: '#F0F2F5',
  slate50: '#F8FAFC',
  page: '#F7F8FC',
  white: '#FFFFFF',
} as const;

/** Semantic colours. Pairs ending in `Foreground` are the text colour for that surface. */
export const colors = {
  background: palette.page,
  foreground: palette.ink,
  card: palette.white,
  cardForeground: palette.ink,
  popover: palette.white,
  popoverForeground: palette.ink,

  primary: palette.indigo600,
  primaryForeground: palette.white,
  primaryHover: palette.indigo700,
  primarySoft: palette.indigo50,

  secondary: palette.slate50,
  secondaryForeground: palette.ink,

  muted: palette.slate50,
  mutedForeground: palette.slate500,

  accent: palette.indigo50,
  accentForeground: palette.indigo600,

  /** Brand cyan: verified badges, info chips. Needs dark text (white fails AA). */
  info: palette.cyan500,
  infoForeground: palette.ink,
  infoSoft: palette.cyan50,

  /** Brand magenta: offers and highlights. */
  highlight: palette.magenta600,
  highlightForeground: palette.white,
  highlightHover: palette.magenta700,
  highlightSoft: palette.magenta50,

  success: palette.green700,
  successForeground: palette.white,
  successSoft: palette.green50,

  warning: palette.amber500,
  warningForeground: palette.ink,
  warningSoft: palette.amber50,

  destructive: palette.red600,
  destructiveForeground: palette.white,
  destructiveSoft: palette.red50,

  border: palette.gray200,
  borderSubtle: palette.gray100,
  input: palette.gray200,
  ring: palette.indigo600,
  /** Placeholder icons, dividers and disabled states only. Fails AA as body text. */
  subtle: palette.gray400,
} as const;

/** Corner radius in px. `lg` (12) is the default card and input radius. */
export const radius = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

/** Spacing scale in px, on a 4 px grid. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** System font stacks: fast, no web-font download, native on each platform. */
export const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

/** Type scale: [font size px, line height px]. Names avoid Tailwind's defaults on purpose. */
export const typeScale = {
  caption: [10, 14],
  label: [11, 16],
  'body-sm': [12, 18],
  body: [14, 20],
  'body-lg': [16, 24],
  'title-sm': [18, 26],
  title: [20, 28],
  'title-lg': [24, 32],
  display: [30, 38],
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const shadow = {
  xs: '0 1px 2px 0 rgb(17 17 17 / 0.05)',
  sm: '0 1px 3px 0 rgb(17 17 17 / 0.08), 0 1px 2px -1px rgb(17 17 17 / 0.08)',
  md: '0 4px 6px -1px rgb(17 17 17 / 0.08), 0 2px 4px -2px rgb(17 17 17 / 0.06)',
  lg: '0 10px 15px -3px rgb(17 17 17 / 0.08), 0 4px 6px -4px rgb(17 17 17 / 0.05)',
} as const;

export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  overlay: 1300,
  modal: 1400,
  toast: 1500,
} as const;

/** Minimum touch target in px (WCAG 2.5.5 and the mobile spec: 44 x 44 pt). */
export const minTouchTarget = 44;

export const tokens = {
  colors,
  radius,
  spacing,
  fontFamily,
  typeScale,
  fontWeight,
  shadow,
  zIndex,
  minTouchTarget,
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
export type TypeScaleToken = keyof typeof typeScale;
