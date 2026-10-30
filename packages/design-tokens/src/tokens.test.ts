import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast.ts';
import { generatedFiles } from './css.ts';
import { nativewindPreset } from './tailwind-preset.ts';
import { colors, minTouchTarget, radius, spacing } from './tokens.ts';

const AA_TEXT = 4.5;

describe('colour contrast (WCAG 2.2 AA, normal text)', () => {
  const foregroundKeys = Object.keys(colors).filter((key) => key.endsWith('Foreground'));

  it.each(foregroundKeys)('%s is readable on its surface', (foregroundKey) => {
    const surfaceKey = foregroundKey.replace(/Foreground$/, '') as keyof typeof colors;
    const foreground = colors[foregroundKey as keyof typeof colors];
    expect(contrastRatio(foreground, colors[surfaceKey])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(['background', 'card', 'muted'] as const)('muted text is readable on %s', (surface) => {
    expect(contrastRatio(colors.mutedForeground, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(['primary', 'highlight', 'success', 'destructive'] as const)(
    '%s is readable as text on the page and on cards',
    (key) => {
      expect(contrastRatio(colors[key], colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors[key], colors.card)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it('keeps the brand colour readable on its soft tint', () => {
    expect(contrastRatio(colors.primary, colors.primarySoft)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('scales', () => {
  it('keeps spacing on the 4 px grid', () => {
    for (const value of Object.values(spacing)) expect(value % 4).toBe(0);
  });

  it('orders radius from none to full', () => {
    const values = Object.values(radius);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('uses a 44 px minimum touch target', () => {
    expect(minTouchTarget).toBeGreaterThanOrEqual(44);
  });
});

describe('generated outputs', () => {
  it.each(Object.entries(generatedFiles))('%s matches src/tokens.ts', (file, build) => {
    const committed = readFileSync(join(import.meta.dirname, '..', file), 'utf8');
    expect(committed).toBe(build());
  });

  it('exposes every colour in the NativeWind preset', () => {
    expect(Object.keys(nativewindPreset.theme.extend.colors)).toHaveLength(
      Object.keys(colors).length,
    );
  });
});
