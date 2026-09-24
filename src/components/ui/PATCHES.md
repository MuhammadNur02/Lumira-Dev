# shadcn/ui patches

Generated with `pnpm dlx shadcn@latest add …` (shadcn 4.x, `radix-vega`, Radix primitives from the
unified `radix-ui` package). Every component below was then patched against the StyleGuide §5.1
checklist. Upstream updates are merged by hand: re-add the component into a scratch branch, diff,
and re-apply the rows below.

## Global patches (all components)

| # | Patch | Why |
|---|---|---|
| 1 | `focus-visible:ring-3 focus-visible:ring-ring/50` → `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`; `focus-visible:border-ring` removed | The translucent 3 px ring does not reach 3:1 on every surface (SG §5.1 #2, NFR-A11Y-02) |
| 2 | `aria-invalid:ring-*` removed; `aria-invalid:border-destructive` kept solid in both themes | Errors are carried by the border + a message linked with `aria-describedby` (SG §5.3) |
| 3 | `shadow-xs` removed from form controls | `border-input` (3:1) is the only edge (SG §5.2) |
| 4 | Overlay content: `rounded-md bg-popover shadow-md ring-1 ring-foreground/10` → `glass-popover rounded-lg shadow-overlay` | Glass recipe with opaque fallbacks (SG §4.6, `src/styles/bento.css`) |
| 5 | Overlay open/close: `duration-100` → `duration-(--spring-snappy-duration) ease-spring-snappy`, close `duration-100 ease-in` | CSS surfaces share Motion's spring physics through the generated `linear()` easings (SG §6.6) |
| 6 | Every file imports `cn` from `@/lib/utils`, never from the `cn` package (lint-enforced) | The configured instance registers Lumira's font-size, shadow and radius tokens; the bare package treats `text-micro` as a color and drops it next to `text-foreground` |

## Per-component patches

| Component | Patch |
|---|---|
| `button` | Replaced with SG §5.4: Motion `m.button` press (`spring.press`, 0.97 / 0.92 for icon sizes), `asChild` uses the CSS `pressable` utility, variants `default` (ink) · `brand` · `secondary` · `outline` · `ghost` · `link` · `destructive`, sizes `sm` 32 · `default` 40 · `lg` 48 · `icon` 40 · `icon-sm` 32 · `icon-xs` 24. Filled-button shadows are tokens (`shadow-button-ink`, `shadow-button-brand`, `shadow-button-brand-hover` in globals.css) because the SG literals would fail the color-literal lint. New `loading` prop keeps the width and swaps the label for a spinner + sr-only "Processing…". |
| `badge` | Rewritten: 24 px pill, `text-caption`; variants `neutral`, `brand`, `success`, `warning`, `info`, `danger`, `outline`, `version` (mono, `rounded-md`, bordered), `stack` (mono, 14 px logo). |
| `card` | `rounded-xl border-bento-border bg-card shadow-bento`; title `text-heading-4`. |
| `input`, `textarea` | 40 px tall (`h-10`), `text-base` at every width (no iOS zoom), no dark `bg-input/30` wash. |
| `select` | Trigger 40 px, hover `bg-accent/50`; content glass (#4, #5); items ≥ 32 px. |
| `dialog` | Overlay `z-70 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]`; content `z-70 rounded-2xl shadow-modal max-w-[30rem]`, open = spring easing with `zoom-in-[0.96]` + 8 px rise, close = 150 ms ease-in; title `text-heading-4`. For Motion-driven dialogs use `motion-dialog.tsx`. |
| `sheet` | Same overlay as dialog; `z-70 shadow-modal`; side sheets 420 px; bottom sheet gets `rounded-t-bento` + safe-area padding. The draggable mobile sheet is `bottom-sheet.tsx`. |
| `tooltip` | Inverse colors, `text-micro`, `rounded-sm`, 400 ms delay, 6 px offset, **no arrow**. |
| `popover`, `dropdown-menu` | Glass (#4, #5); items ≥ 32 px, `text-body-sm`. |
| `tabs` | Pill list `rounded-md p-1 h-10`; triggers `rounded-sm`, active `bg-card`. |
| `toggle`, `toggle-group` | New `segmented` variant (SG §5.3): `bg-muted rounded-md p-1`, 32 px items; the active pill is a Motion `layoutId` indicator rendered by `components/lumira/segmented-control.tsx`. |
| `command` | Rewritten for ⌘K: 40 rem dialog, 48 px input row, 40 px items, mono group headings, `CommandShortcut` holds `Kbd`s. `CommandDialog` wraps its children in the cmdk root and forwards `shouldFilter` (server-side search passes `false`). |
| `table` | `text-body-sm tabular-nums`, sticky 44 px header in `text-caption` muted, 44 px rows, hairline dividers, hover `bg-accent/50`. |
| `sidebar` | Collapsed width 56 px (`3.5rem`); width transitions use the `smooth` spring easing; active menu item draws a 2 px `bg-brand` left indicator. |
| `accordion` | Rewritten for FAQ: hairline dividers, `text-heading-4` triggers, `Plus` icon rotating 45°, height animated in `bento.css` with `--spring-smooth`. |
| `kbd` | Mono 12 px, 20 px tall, `rounded-xs`, bordered, inner bottom edge. |
| `progress` | Usage meter: `brand-subtle` track, `brand` fill; ≥ 80 % `warning`, 100 % `destructive`. |
| `skeleton` | `skeleton-shimmer` utility (1.6 s, static under reduced motion), `aria-hidden`. |
| `sonner` | Glass toasts, status icons in status tokens, bottom-right desktop / top-center mobile, follows `resolvedTheme`. |
| `empty` | `rounded-bento`; 48 px icon tile (`rounded-lg`, hairline, `shadow-bento`); `text-heading-4` title; `text-body-sm` muted description. |
| `alert` | `rounded-xl border-bento-border`; added `warning`, `info`, `success`; `destructive` uses the subtle status surface. |
| `hooks/use-mobile` | Rewritten on `useSyncExternalStore` (no setState in effects; React Compiler safe). |
