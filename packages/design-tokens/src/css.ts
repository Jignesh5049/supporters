import { colors, fontFamily, radius, shadow, spacing, typeScale, zIndex } from './tokens.ts';

const HEADER =
  '/* Generated from src/tokens.ts by `pnpm --filter @supporters/design-tokens generate`. Do not edit. */\n';

/** camelCase -> kebab-case, e.g. primaryForeground -> primary-foreground. */
const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
const px = (value: number) => (value === 0 ? '0' : `${value / 16}rem`);

/** Plain CSS variables. Works anywhere, with or without Tailwind. */
export function buildTokensCss(): string {
  const lines = [
    ...Object.entries(colors).map(([name, value]) => `  --${kebab(name)}: ${value};`),
    `  --radius: ${px(radius.lg)};`,
    ...Object.entries(radius).map(
      ([name, value]) => `  --radius-${name}: ${value === 9999 ? '9999px' : px(value)};`,
    ),
    ...Object.entries(spacing).map(([name, value]) => `  --space-${name}: ${px(value)};`),
    ...Object.entries(fontFamily).map(([name, value]) => `  --font-${name}: ${value};`),
    ...Object.entries(typeScale).flatMap(([name, [size, lineHeight]]) => [
      `  --text-${name}: ${px(size)};`,
      `  --text-${name}--line-height: ${px(lineHeight)};`,
    ]),
    ...Object.entries(shadow).map(([name, value]) => `  --shadow-${name}: ${value};`),
    ...Object.entries(zIndex).map(([name, value]) => `  --z-${name}: ${value};`),
  ];
  return `${HEADER}\n:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * Tailwind 4 theme mapping: exposes the variables as utilities
 * (`bg-primary`, `text-muted-foreground`, `rounded-lg`, `text-body`, `shadow-sm`).
 * Import after tokens.css in a stylesheet that Tailwind processes.
 */
export function buildTailwindThemeCss(): string {
  const lines = [
    ...Object.keys(colors).map((name) => `  --color-${kebab(name)}: var(--${kebab(name)});`),
    ...Object.keys(radius).map((name) => `  --radius-${name}: var(--radius-${name});`),
    ...Object.keys(fontFamily).map((name) => `  --font-${name}: var(--font-${name});`),
    ...Object.keys(typeScale).flatMap((name) => [
      `  --text-${name}: var(--text-${name});`,
      `  --text-${name}--line-height: var(--text-${name}--line-height);`,
    ]),
    ...Object.keys(shadow).map((name) => `  --shadow-${name}: var(--shadow-${name});`),
  ];
  return `${HEADER}\n@theme inline {\n${lines.join('\n')}\n}\n`;
}

export const generatedFiles = {
  'css/tokens.css': buildTokensCss,
  'css/tailwind-theme.css': buildTailwindThemeCss,
} as const;
