# @supporters/design-tokens

The single source of truth for colour, radius, spacing, type, shadow and layering, on web and mobile. `src/tokens.ts` holds the values; everything else is generated from it.

| Output | Used by | How |
| --- | --- | --- |
| `css/tokens.css` | Web (`packages/ui-web`, `apps/web`) | `@import "@supporters/design-tokens/tokens.css";` |
| `css/tailwind-theme.css` | Web, Tailwind 4 | `@import "@supporters/design-tokens/tailwind-theme.css";` after `tokens.css`, which enables `bg-primary`, `text-muted-foreground`, `rounded-lg`, `text-body`, `shadow-sm` |
| `nativewindPreset` | Mobile, NativeWind 4 (Tailwind 3) | `presets: [require('nativewind/preset'), nativewindPreset]` |
| `tokens`, `colors`, ... | Any TypeScript | `import { colors } from '@supporters/design-tokens'` |

Colour names follow shadcn/ui, so shadcn/ui (web) and React Native Reusables (mobile) components work as-is.

## Changing a token

1. Edit `src/tokens.ts`.
2. Run `pnpm --filter @supporters/design-tokens generate` to rewrite `css/*`, and commit both.
3. Run `pnpm --filter @supporters/design-tokens test`. Every `xForeground` / `x` pair must reach WCAG AA contrast (4.5:1).

CI fails if the generated CSS is stale or a contrast check fails.

## Accessibility changes from the prototype

- **Destructive** is `#DC2626`, not `#EF4444`: white on `#EF4444` is 3.76:1, under AA.
- **Success** is `#047857`, not `#10B981`: white on `#10B981` is 2.54:1.
- **Cyan** (`info`) takes dark text: white on `#00AEEF` is 2.53:1, while ink is 7.46:1.
- **`subtle` grey** (`#9CA3AF`) is for icons, dividers and disabled states only. As text it is 2.54:1, so use `muted-foreground` for secondary text.
