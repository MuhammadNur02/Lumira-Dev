# Lumira — Design System & Motion Guide

| | |
|---|---|
| **Document** | `StyleGuide.md` · v1.0 · **Status:** Approved for engineering |
| **Last updated** | 2026-09-24 |
| **Implements** | `PRD.md` (NFR-A11Y, NFR-PERF, FR-LP, FR-SF) |
| **Stack** | Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui 4.x (Radix + Vega preset, patched), Motion (`motion/react`), React `<ViewTransition>`, Geist Sans + Geist Mono |

Every color value in this guide was computed, not eyeballed. §2.5 lists the measured WCAG contrast ratios. §2.6 lists the validated data-visualization palette. §6.2 lists the damping ratios and settle times of every spring.

---

## 0. Design Principles

**Brand concept: "Light as material."** *Lumira* comes from *lumen*. The interface behaves as if one soft light source sits at the **top-left**: tiles catch a 1 px highlight on their top edge, fall into a faint inner shade at the bottom, and the brand color appears as *emitted light* (glows, focus rings, selection), never as paint.

| # | Principle | In practice |
|---|---|---|
| 1 | **The product is the hero.** | Chrome recedes: neutral surfaces, hairline borders, one accent. Product media and live demos carry the color. |
| 2 | **Calm precision.** | 4 px spacing grid, a 12-column Bento grid with enumerated compositions, concentric radii, tabular numbers where values align. |
| 3 | **Asymmetry with balance.** | Bento bands alternate their heavy side; the weighted centroid of every band pair stays near the page center (§4.3). |
| 4 | **Motion has mass.** | Interactions use damped springs with explicit stiffness, damping and mass. Nothing moves on a linear timeline. Exits are quicker than entrances. |
| 5 | **Trust is visible.** | Prices, versions, checksums, activation counts and license terms are shown plainly, in monospace where precision matters. |
| 6 | **Fast is a feature.** | Every visual effect has a performance budget (§4.6, §6.7) and a reduced-motion fallback (§6.8). |

---

## 1. Foundations

### 1.1 Spacing

Base unit **4 px** (Tailwind's default `--spacing: 0.25rem`). Use steps from this set only:

| Token (Tailwind) | px | Typical use |
|---|---|---|
| `1` | 4 | Icon-to-text gap in dense UI |
| `1.5` | 6 | Label → input gap |
| `2` | 8 | Inline gaps, chip padding |
| `3` | 12 | Control group gaps; mobile Bento gap |
| `4` | 16 | Tablet Bento gap; card inner gap |
| `5` | 20 | Mobile tile padding; desktop Bento gap |
| `6` | 24 | Desktop tile padding |
| `8` | 32 | Hero tile padding; stage padding |
| `12` | 48 | Section header → content |
| `24` / `32` | 96 / 128 | Section vertical rhythm (mobile / desktop) |

### 1.2 Breakpoints & Containers

Tailwind v4 defaults are kept: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.

| Container | Max width | Side padding |
|---|---|---|
| `--container-page` | 1280 px (`80rem`) | 16 px mobile · 24 px `sm` · 32 px `lg` |
| `--container-prose` | 720 px (`45rem`) | Docs and blog body (~70 characters per line) |
| `--container-wide` | 1440 px (`90rem`) | Home hero, Live Preview toolbar |

### 1.3 Radius Scale (concentric)

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 6 px | Kbd, tiny chips |
| `--radius-sm` | 8 px | Small buttons, menu items, tooltips |
| `--radius-md` | 10 px | Buttons, inputs, segmented controls |
| `--radius-lg` | 12 px | Popovers, dropdowns, code blocks, license key field |
| `--radius-xl` | 16 px | Cards, media inside tiles |
| `--radius-2xl` | 20 px | Dialogs, command palette |
| `--radius-bento` | 24 px (20 px below `md`) | Bento tiles |
| `--radius-device` | 44 px | Mobile device frame (Live Preview) |

**Concentric rule:** an element nested inside a rounded container with inset `p` uses radius `R_inner = R_outer − p` (minimum 6 px). Example: media inset 8 px inside a 24 px tile → 16 px (`--radius-xl`). Mismatched radii are the most common reason Bento layouts look cheap.

### 1.4 Elevation & Layers

| Level | Surface | Shadow token | z-index |
|---|---|---|---|
| 0 · Canvas | `--background` | — | 0 |
| 1 · Tile / card | `--card` | `--shadow-bento` | 0 |
| 2 · Raised (hovered tile, sticky rail) | `--card` | `--shadow-raised` | 20 |
| 3 · Overlay (popover, dropdown, ⌘K) | `--popover` + blur | `--shadow-overlay` | 50 |
| 4 · Modal (dialog, sheet, preview modal) | `--popover` | `--shadow-modal` | 70 |
| Header | glass | hairline | 40 |
| Toasts | `--popover` + blur | `--shadow-overlay` | 80 |

---

## 2. Color

### 2.1 Primitive Palettes (OKLCH, sRGB-safe)

All primitives are inside the sRGB gamut (checked with an OKLCH → linear-sRGB conversion). Hex values are the exact sRGB conversion, for tools that cannot read OKLCH.

**Graphite** (neutral, hue 264, slightly cool)

| Step | OKLCH | Hex | | Step | OKLCH | Hex |
|---|---|---|---|---|---|---|
| 0 | `oklch(1 0 0)` | `#ffffff` | | 600 | `oklch(0.446 0.014 264)` | `#50545c` |
| 25 | `oklch(0.992 0.002 264)` | `#fcfcfe` | | 700 | `oklch(0.372 0.013 264)` | `#3d4047` |
| 50 | `oklch(0.984 0.003 264)` | `#f9fafc` | | 800 | `oklch(0.282 0.012 264)` | `#26292f` |
| 100 | `oklch(0.968 0.004 264)` | `#f3f4f7` | | 850 | `oklch(0.240 0.011 264)` | `#1d1f25` |
| 150 | `oklch(0.948 0.005 264)` | `#eceef1` | | 875 | `oklch(0.225 0.010 264)` | `#191c21` |
| 200 | `oklch(0.922 0.006 264)` | `#e3e5e9` | | 900 | `oklch(0.205 0.010 264)` | `#15171c` |
| 300 | `oklch(0.870 0.008 264)` | `#d1d4da` | | 915 | `oklch(0.195 0.009 264)` | `#131519` |
| 400 | `oklch(0.705 0.012 264)` | `#9ca0a8` | | 925 | `oklch(0.178 0.009 264)` | `#0f1115` |
| 450 | `oklch(0.640 0.012 264)` | `#888c94` | | 940 | `oklch(0.165 0.008 264)` | `#0d0e12` |
| 500 | `oklch(0.535 0.014 264)` | `#696d76` | | 950 | `oklch(0.150 0.008 264)` | `#090b0f` |
| 550 | `oklch(0.500 0.012 264)` | `#60636a` | | 975 | `oklch(0.130 0.007 264)` | `#06070a` |

**Lumen** (brand, hue 277, indigo-violet; chroma capped to the sRGB gamut at high lightness)

| Step | OKLCH | Hex | Primary role |
|---|---|---|---|
| 50 | `oklch(0.972 0.012 277)` | `#f3f5fe` | Brand-subtle background (light) |
| 100 | `oklch(0.943 0.025 277)` | `#e7ebfd` | Selection (light) |
| 200 | `oklch(0.890 0.050 277)` | `#d2d8fc` | Brand-subtle text (dark) |
| 300 | `oklch(0.812 0.088 277)` | `#b3bdfb` | Brand text and links (dark) |
| 400 | `oklch(0.712 0.140 277)` | `#8d98f8` | Focus ring (dark) |
| 500 | `oklch(0.620 0.190 277)` | `#6d74f5` | Focus ring (light); chart-1 (dark) |
| 600 | `oklch(0.545 0.215 277)` | `#5856e9` | **Brand fill** (both themes); chart-1 (light) |
| 700 | `oklch(0.470 0.195 277)` | `#4643c4` | Brand text and links (light) |
| 800 | `oklch(0.395 0.160 277)` | `#363499` | Brand-subtle text (light) |
| 900 | `oklch(0.318 0.120 277)` | `#26266d` | Deep glows (dark) |
| 950 | `oklch(0.230 0.080 277)` | `#151641` | Brand-subtle background base (dark) |

**Semantic hues**

| Role | Light text / icon | Light subtle bg | Dark text / icon | Dark subtle bg |
|---|---|---|---|---|
| Success (155°) | `oklch(0.53 0.13 155)` `#048149` | `oklch(0.968 0.028 155)` `#e7faec` | `oklch(0.76 0.15 155)` `#52cd86` | `oklch(0.25 0.045 155)` `#0d2818` |
| Warning (60–85°) | `oklch(0.50 0.11 60)` `#905211` | `oklch(0.972 0.028 85)` `#fff5e1` | `oklch(0.83 0.14 80)` `#f7bc50` | `oklch(0.26 0.045 75)` `#312108` |
| Danger (22–25°) | `oklch(0.555 0.205 25)` `#d0242d` | `oklch(0.968 0.014 25)` `#fef1f0` | `oklch(0.70 0.17 22)` `#f66c6d` | `oklch(0.25 0.05 22)` `#361717` |
| Info (235–240°) | `oklch(0.52 0.115 240)` `#0d70a4` | `oklch(0.97 0.014 240)` `#edf7fe` | `oklch(0.74 0.12 235)` `#53b6eb` | `oklch(0.25 0.04 240)` `#0e2433` |

### 2.2 Semantic Tokens

Names follow shadcn/ui conventions, so every shadcn component, the Clerk `shadcn` theme and Fumadocs read them unchanged. Lumira-specific tokens are marked ★.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` | graphite-50 `#f9fafc` | graphite-975 `#06070a` | Page canvas |
| `--foreground` | graphite-950 `#090b0f` | graphite-50 `#f9fafc` | Body text |
| `--card` / `--card-foreground` | `#ffffff` / graphite-950 | graphite-940 `#0d0e12` / graphite-50 | Bento tiles: one step *lighter* than the canvas in dark mode |
| `--popover` / `--popover-foreground` | `#ffffff` / graphite-950 | graphite-915 `#131519` / graphite-50 | Used at 85 % alpha behind blur |
| `--primary` / `--primary-foreground` | graphite-925 `#0f1115` / graphite-25 | graphite-50 / graphite-950 | Ink buttons (Buy, main CTAs) invert per theme |
| `--secondary` / `--secondary-foreground` | graphite-100 / graphite-900 | graphite-875 `#191c21` / graphite-50 | |
| `--muted` / `--muted-foreground` | graphite-100 / graphite-500 `#696d76` | graphite-875 / `oklch(0.72 0.012 264)` `#a1a5ac` | Secondary text |
| `--accent` / `--accent-foreground` | graphite-100 / graphite-900 | graphite-875 / graphite-50 | Hover washes (shadcn semantics, not the brand) |
| `--destructive` / `--destructive-foreground` | danger `#d0242d` / `#ffffff` | danger `#f66c6d` / graphite-950 | |
| `--border` | graphite-200 `#e3e5e9` | `oklch(1 0 0 / 0.08)` | Decorative hairlines |
| `--input` | graphite-450 `#888c94` | graphite-550 `#60636a` | Form-control borders; ≥ 3:1 (WCAG 1.4.11) |
| `--ring` | lumen-500 `#6d74f5` | lumen-400 `#8d98f8` | Focus rings; ≥ 3:1 |
| ★ `--brand` / `--brand-foreground` | lumen-600 `#5856e9` / `#ffffff` | lumen-600 / `#ffffff` | Brand fills (All-Access, highlights) |
| ★ `--brand-text` | lumen-700 `#4643c4` | lumen-300 `#b3bdfb` | Links, brand-colored text |
| ★ `--brand-subtle` / `--brand-subtle-foreground` | lumen-50 / lumen-800 | `oklch(0.26 0.06 277)` / lumen-200 | Brand badges, selected rows |
| ★ `--success`, `--warning`, `--info` (+ `-subtle`) | §2.1 light columns | §2.1 dark columns | Status: always icon + label |
| ★ `--bento-border` | `oklch(0.2 0.01 264 / 0.08)` | `oklch(1 0 0 / 0.07)` | Tile hairline |
| ★ `--bento-highlight` | `oklch(1 0 0 / 0.9)` | `oklch(1 0 0 / 0.06)` | 1 px top-edge light catch |
| ★ `--bento-shade` | `oklch(0.2 0.01 264 / 0.06)` | `oklch(0 0 0 / 0.5)` | Inner bottom shade |
| ★ `--stage` / `--stage-dot` | graphite-100 / graphite-300 | `oklch(0.145 0.008 264)` / `oklch(1 0 0 / 0.06)` | Live Preview canvas + dot grid |
| ★ `--glow` | lumen-500 at 14 % | lumen-500 at 22 % | Hero light blooms, spotlight |
| `--chart-1…5` | §2.6 | §2.6 | Validated categorical order |
| `--sidebar-*` | graphite-25 surface, graphite-200 border | graphite-940 surface, white 8 % border | Admin and account sidebars |

### 2.3 Implementation — `src/app/globals.css`

```css
@layer theme, base, clerk, components, utilities; /* Clerk styles sit below utilities (§5.8) */

@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";            /* data-open:/data-closed: variants + accordion keyframes used by shadcn 4.x */
@import "../styles/springs.css";          /* generated, §6.6 */
@import "../styles/typography.css";       /* §3.3 */
@import "../styles/bento.css";            /* §4.2, §4.5, §4.7, §5.4 pressable */
@import "../styles/view-transitions.css"; /* §6.5 */

/* The spec documents in the repo root are full of example class names; keep them out of the bundle. */
@source not "../../*.md";

@custom-variant dark (&:where(.dark, .dark *));

/* ---------- Primitives ---------- */
:root {
  --graphite-0: oklch(1 0 0);            --graphite-25: oklch(0.992 0.002 264);
  --graphite-50: oklch(0.984 0.003 264); --graphite-100: oklch(0.968 0.004 264);
  --graphite-150: oklch(0.948 0.005 264);--graphite-200: oklch(0.922 0.006 264);
  --graphite-300: oklch(0.87 0.008 264); --graphite-400: oklch(0.705 0.012 264);
  --graphite-450: oklch(0.64 0.012 264); --graphite-500: oklch(0.535 0.014 264);
  --graphite-550: oklch(0.5 0.012 264);  --graphite-600: oklch(0.446 0.014 264);
  --graphite-700: oklch(0.372 0.013 264);--graphite-800: oklch(0.282 0.012 264);
  --graphite-850: oklch(0.24 0.011 264); --graphite-875: oklch(0.225 0.01 264);
  --graphite-900: oklch(0.205 0.01 264); --graphite-915: oklch(0.195 0.009 264);
  --graphite-925: oklch(0.178 0.009 264);--graphite-940: oklch(0.165 0.008 264);
  --graphite-950: oklch(0.15 0.008 264); --graphite-975: oklch(0.13 0.007 264);

  --lumen-50: oklch(0.972 0.012 277);  --lumen-100: oklch(0.943 0.025 277);
  --lumen-200: oklch(0.89 0.05 277);   --lumen-300: oklch(0.812 0.088 277);
  --lumen-400: oklch(0.712 0.14 277);  --lumen-500: oklch(0.62 0.19 277);
  --lumen-600: oklch(0.545 0.215 277); --lumen-700: oklch(0.47 0.195 277);
  --lumen-800: oklch(0.395 0.16 277);  --lumen-900: oklch(0.318 0.12 277);
  --lumen-950: oklch(0.23 0.08 277);
}

/* ---------- Light theme (default) ---------- */
:root {
  color-scheme: light;
  --radius: 0.75rem;

  --background: var(--graphite-50);   --foreground: var(--graphite-950);
  --card: var(--graphite-0);          --card-foreground: var(--graphite-950);
  --popover: var(--graphite-0);       --popover-foreground: var(--graphite-950);
  --primary: var(--graphite-925);     --primary-foreground: var(--graphite-25);
  --secondary: var(--graphite-100);   --secondary-foreground: var(--graphite-900);
  --muted: var(--graphite-100);       --muted-foreground: var(--graphite-500);
  --accent: var(--graphite-100);      --accent-foreground: var(--graphite-900);
  --destructive: oklch(0.555 0.205 25); --destructive-foreground: var(--graphite-0);
  --border: var(--graphite-200);      --input: var(--graphite-450);
  --ring: var(--lumen-500);

  --brand: var(--lumen-600);          --brand-foreground: var(--graphite-0);
  --brand-text: var(--lumen-700);
  --brand-subtle: var(--lumen-50);    --brand-subtle-foreground: var(--lumen-800);
  --success: oklch(0.53 0.13 155);    --success-subtle: oklch(0.968 0.028 155);
  --warning: oklch(0.5 0.11 60);      --warning-subtle: oklch(0.972 0.028 85);
  --info: oklch(0.52 0.115 240);      --info-subtle: oklch(0.97 0.014 240);
  --destructive-subtle: oklch(0.968 0.014 25);

  --bento-border: oklch(0.2 0.01 264 / 0.08);
  --bento-highlight: oklch(1 0 0 / 0.9);
  --bento-shade: oklch(0.2 0.01 264 / 0.06);
  --stage: var(--graphite-100);       --stage-dot: var(--graphite-300);
  --glow: color-mix(in oklch, var(--lumen-500) 14%, transparent);

  --chart-1: #5856e9; --chart-2: #eb6834; --chart-3: #1baf7a; --chart-4: #eda100; --chart-5: #e87ba4;

  --sidebar: var(--graphite-25);      --sidebar-foreground: var(--graphite-950);
  --sidebar-primary: var(--graphite-925); --sidebar-primary-foreground: var(--graphite-25);
  --sidebar-accent: var(--graphite-100);  --sidebar-accent-foreground: var(--graphite-900);
  --sidebar-border: var(--graphite-200);  --sidebar-ring: var(--lumen-500);

  /* Depth: one light source, top-left */
  --bento-shadow:
    inset 0 1px 0 0 var(--bento-highlight),
    inset 0 -24px 48px -32px var(--bento-shade),
    0 1px 2px 0 oklch(0.2 0.01 264 / 0.04),
    0 8px 24px -12px oklch(0.2 0.01 264 / 0.08);
  --raised-shadow:
    inset 0 1px 0 0 var(--bento-highlight),
    0 2px 4px 0 oklch(0.2 0.01 264 / 0.05),
    0 16px 40px -16px oklch(0.2 0.01 264 / 0.16);
  --overlay-shadow: 0 0 0 1px var(--bento-border), 0 12px 32px -8px oklch(0.2 0.01 264 / 0.18);
  --modal-shadow: 0 0 0 1px var(--bento-border), 0 24px 64px -16px oklch(0.2 0.01 264 / 0.28);
}

/* ---------- Dark theme ---------- */
.dark {
  color-scheme: dark;
  --background: var(--graphite-975);  --foreground: var(--graphite-50);
  --card: var(--graphite-940);        --card-foreground: var(--graphite-50);
  --popover: var(--graphite-915);     --popover-foreground: var(--graphite-50);
  --primary: var(--graphite-50);      --primary-foreground: var(--graphite-950);
  --secondary: var(--graphite-875);   --secondary-foreground: var(--graphite-50);
  --muted: var(--graphite-875);       --muted-foreground: oklch(0.72 0.012 264);
  --accent: var(--graphite-875);      --accent-foreground: var(--graphite-50);
  --destructive: oklch(0.7 0.17 22);  --destructive-foreground: var(--graphite-950);
  --border: oklch(1 0 0 / 0.08);      --input: var(--graphite-550);
  --ring: var(--lumen-400);

  --brand: var(--lumen-600);          --brand-foreground: var(--graphite-0);
  --brand-text: var(--lumen-300);
  --brand-subtle: oklch(0.26 0.06 277); --brand-subtle-foreground: var(--lumen-200);
  --success: oklch(0.76 0.15 155);    --success-subtle: oklch(0.25 0.045 155);
  --warning: oklch(0.83 0.14 80);     --warning-subtle: oklch(0.26 0.045 75);
  --info: oklch(0.74 0.12 235);       --info-subtle: oklch(0.25 0.04 240);
  --destructive-subtle: oklch(0.25 0.05 22);

  --bento-border: oklch(1 0 0 / 0.07);
  --bento-highlight: oklch(1 0 0 / 0.06);
  --bento-shade: oklch(0 0 0 / 0.5);
  --stage: oklch(0.145 0.008 264);    --stage-dot: oklch(1 0 0 / 0.06);
  --glow: color-mix(in oklch, var(--lumen-500) 22%, transparent);

  --chart-1: #6d74f5; --chart-2: #d95926; --chart-3: #199e70; --chart-4: #c98500; --chart-5: #d55181;

  --sidebar: var(--graphite-940);     --sidebar-foreground: var(--graphite-50);
  --sidebar-primary: var(--graphite-50); --sidebar-primary-foreground: var(--graphite-950);
  --sidebar-accent: var(--graphite-875); --sidebar-accent-foreground: var(--graphite-50);
  --sidebar-border: oklch(1 0 0 / 0.08); --sidebar-ring: var(--lumen-400);

  --bento-shadow:
    inset 0 1px 0 0 var(--bento-highlight),
    inset 0 -24px 48px -32px var(--bento-shade),
    0 1px 2px 0 oklch(0 0 0 / 0.5);
  --raised-shadow:
    inset 0 1px 0 0 oklch(1 0 0 / 0.09),
    0 16px 40px -16px oklch(0 0 0 / 0.7);
  --overlay-shadow: 0 0 0 1px var(--bento-border), 0 16px 40px -8px oklch(0 0 0 / 0.6);
  --modal-shadow: 0 0 0 1px var(--bento-border), 0 32px 80px -16px oklch(0 0 0 / 0.75);
}

/* ---------- Tailwind theme bridge ---------- */
@theme inline {
  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-subtle: var(--destructive-subtle);
  --color-border: var(--border);           --color-input: var(--input);   --color-ring: var(--ring);
  --color-brand: var(--brand);             --color-brand-foreground: var(--brand-foreground);
  --color-brand-text: var(--brand-text);
  --color-brand-subtle: var(--brand-subtle); --color-brand-subtle-foreground: var(--brand-subtle-foreground);
  --color-success: var(--success);         --color-success-subtle: var(--success-subtle);
  --color-warning: var(--warning);         --color-warning-subtle: var(--warning-subtle);
  --color-info: var(--info);               --color-info-subtle: var(--info-subtle);
  --color-bento-border: var(--bento-border);
  --color-stage: var(--stage);             --color-stage-dot: var(--stage-dot);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4); --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);         --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border); --color-sidebar-ring: var(--sidebar-ring);

  --radius-xs: 6px;
  --radius-sm: calc(var(--radius) - 4px);  /* 8  */
  --radius-md: calc(var(--radius) - 2px);  /* 10 */
  --radius-lg: var(--radius);              /* 12 */
  --radius-xl: calc(var(--radius) + 4px);  /* 16 */
  --radius-2xl: calc(var(--radius) + 8px); /* 20 */

  --shadow-bento: var(--bento-shadow);
  --shadow-raised: var(--raised-shadow);
  --shadow-overlay: var(--overlay-shadow);
  --shadow-modal: var(--modal-shadow);

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-heading: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; /* shadcn 4.x titles use font-heading */
}

/* Not inline: utilities must read the variable so the mobile override below reaches `rounded-bento` */
@theme {
  --radius-bento: 1.5rem;   /* 24 */
  --radius-device: 2.75rem; /* 44 */
}

@layer base {
  * { @apply border-border; }
  html { -webkit-text-size-adjust: 100%; text-rendering: optimizeLegibility; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  ::selection { background: color-mix(in oklch, var(--lumen-500) 28%, transparent); }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
}

@media (max-width: 767px) { :root { --radius-bento: 1.25rem; } }
```

### 2.4 Dark Mode Strategy

| Decision | Rule |
|---|---|
| **Mechanism** | `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`; `<html suppressHydrationWarning>`. Tailwind's `dark:` variant is bound to `.dark` through `@custom-variant`. |
| **Default** | **Dark first.** Lumira's baseline is the deep dark canvas (`#06070a`): "light as material" reads strongest on dark, and the audience works in dark tools. Light is a fully designed, contrast-checked peer, reachable through the toggle or by choosing "System". |
| **Designed, not inverted** | Dark mode has its own steps. Elevation is expressed through *lightness*: canvas `#06070a` → tile `#0d0e12` → popover `#131519` → muted `#191c21`. Drop shadows barely register on dark canvases, so depth comes from the 6 % top highlight, the 7 % white hairline and the inner shade. |
| **Brand behavior** | The brand fill stays `lumen-600` (white text 5.35:1 in both themes). Brand *text* moves to `lumen-300` in dark mode for 11:1 contrast. Glows get stronger (22 % vs 14 %) because light reads brighter on dark. |
| **Status colors** | Separate dark steps (§2.1): lighter text on deep, low-chroma subtle backgrounds. |
| **Images** | Product media ships light and dark variants when the product supports both; `ThemedImage` renders both with `dark:hidden` / `hidden dark:block` and `loading="lazy"`. Above-the-fold hero media uses one neutral variant framed on the `--stage` color, so exactly one LCP image downloads. |
| **Code** | Shiki dual themes (`github-light` / `github-dark-dimmed`) through CSS variables; no re-render on theme change. |
| **Clerk & docs** | Both read the same CSS variables (§5.8, §5.9), so theme changes propagate without JS. |
| **Theme switch** | Circular View Transition reveal from the toggle (§6.5.6). `disableTransitionOnChange` prevents CSS transitions from firing mid-switch. |
| **Meta** | `<meta name="theme-color">` for both schemes: `#f9fafc` (light) and `#06070a` (dark). |

### 2.5 Contrast Matrix (measured, WCAG 2.x)

| Pair | Light | Dark | Requirement |
|---|---|---|---|
| `foreground` on `background` | 18.79 | 19.21 | ≥ 4.5 ✅ |
| `foreground` on `card` | 19.67 | 18.40 | ≥ 4.5 ✅ |
| `muted-foreground` on `background` | 4.94 | 8.11 | ≥ 4.5 ✅ |
| `muted-foreground` on `card` | 5.17 | 7.77 | ≥ 4.5 ✅ |
| `muted-foreground` on `muted` | 4.71 | 6.89 | ≥ 4.5 ✅ |
| `muted-foreground` on `popover` | 5.17 | 7.37 | ≥ 4.5 ✅ |
| `primary-foreground` on `primary` | 18.45 | 18.79 | ≥ 4.5 ✅ |
| `brand-foreground` on `brand` | 5.35 | 5.35 | ≥ 4.5 ✅ |
| `brand-text` on `background` | 7.01 | 11.08 | ≥ 4.5 ✅ |
| `brand-text` on `card` | 7.34 | 10.61 | ≥ 4.5 ✅ |
| `brand-subtle-foreground` on `brand-subtle` | 9.17 | 11.23 | ≥ 4.5 ✅ |
| `destructive` text on `card` | 5.28 | 6.68 | ≥ 4.5 ✅ |
| `destructive-foreground` on `destructive` | 5.28 | 6.82 | ≥ 4.5 ✅ |
| `success` on `success-subtle` | 4.56 | 7.80 | ≥ 4.5 ✅ |
| `warning` on `warning-subtle` | 5.72 | 9.13 | ≥ 4.5 ✅ |
| `info` on `info-subtle` | 4.99 | 7.05 | ≥ 4.5 ✅ |
| `destructive` on `destructive-subtle` | 4.79 | 5.64 | ≥ 4.5 ✅ |
| `input` border on `card` | 3.36 | 3.21 | ≥ 3 ✅ (1.4.11) |
| `input` border on `background` | 3.21 | 3.35 | ≥ 3 ✅ |
| `ring` on `background` | 3.67 | 7.66 | ≥ 3 ✅ (1.4.11) |
| `ring` on `card` | 3.84 | 7.34 | ≥ 3 ✅ |

`--border` (1.26:1 light) is decorative by design and never the only affordance of an interactive control. Contrast tests (`pnpm check:contrast`, Task.md P1.05) run in CI against these exact values; a token change that drops a pair below its requirement fails the build.

### 2.6 Data-Visualization Palette (Admin Dashboard)

Validated with the data-viz palette checker (lightness band, chroma floor, protan/deutan CVD separation in OKLab ΔE ×100, normal-vision floor, contrast against the chart surface). Chart surface = `--card` (`#ffffff` light, `#0d0e12` dark).

**Categorical** (fixed order, never cycled; a sixth series folds into "Other")

| Slot | Hue | Light | Dark |
|---|---|---|---|
| `--chart-1` | Lumen (brand) | `#5856e9` | `#6d74f5` |
| `--chart-2` | Orange | `#eb6834` | `#d95926` |
| `--chart-3` | Aqua | `#1baf7a` | `#199e70` |
| `--chart-4` | Amber | `#eda100` | `#c98500` |
| `--chart-5` | Magenta | `#e87ba4` | `#d55181` |

| Check (adjacent pairs, 5 slots) | Light | Dark |
|---|---|---|
| Lightness band / chroma floor | PASS | PASS |
| Worst CVD ΔE (target ≥ 8) | 9.1 (amber ↔ aqua, protan) | 8.4 (amber ↔ aqua, protan) |
| Worst normal-vision ΔE (floor ≥ 15) | 19.6 | 19.3 |
| Contrast vs surface ≥ 3:1 | **WARN**: aqua 2.82, amber 2.17, magenta 2.69 | PASS |
| All-pairs, first 3 slots (donut / scatter) | CVD 9.2 · normal 27.6 · PASS | CVD 9.4 · normal 26.5 · PASS |

**Relief rule (light mode):** slots 3–5 fall below 3:1 against white, so every multi-series chart ships a legend, selective direct labels and a "View as table" toggle. Charts that use scatter, donut or small multiples are capped at the first three slots.

**Ordinal ramp (funnel stages):** one hue, monotone lightness; the 4-step ramp is validated in both themes (monotone L, adjacent ΔL ≥ 0.06, near-surface end ≥ 2:1).

| Stage (purchase funnel) | Light (on `#ffffff`) | Dark (on `#0d0e12`) |
|---|---|---|
| 1 Sessions | lumen-400 `#8d98f8` (2.63:1 ✓ ≥ 2) | lumen-700 `#4643c4` (2.63:1 ✓ ≥ 2) |
| 2 PDP views | lumen-500 `#6d74f5` | lumen-600 `#5856e9` |
| 3 Checkout started | lumen-700 `#4643c4` | lumen-400 `#8d98f8` |
| 4 Purchase | lumen-800 `#363499` | lumen-300 `#b3bdfb` |

The preview-engagement funnel (PDP views → Preview opens → Preview buy clicks) reuses stages 2–4. Preview is not a required step of the purchase funnel, because many buyers never open it.

**Diverging (MRR movements):** positive arm `--chart-1` (New, Expansion, Reactivation), negative arm red (`#e34948` light / `#e66767` dark: Contraction, Churn), neutral baseline graphite-200 / graphite-800.

**Status** (payment failed, anomaly, webhook error): semantic `--success` / `--warning` / `--destructive` / `--info`, **always paired with an icon and a text label**, and never used as a series color in the same chart.

### 2.7 Color Usage Rules

1. **90 / 8 / 2**: neutrals ≈ 90 % of any screen, product media ≈ 8 %, brand ≤ 2 %. The brand is light, not paint.
2. **One brand-filled element per viewport**, usually the All-Access CTA or a selected state. The primary Buy button is **ink** (`--primary`), which reads as more premium and stays neutral next to colorful product media.
3. Never place brand text on brand-subtle backgrounds for body copy (use `--brand-subtle-foreground`).
4. Glows (`--glow`) come from the top-left, at most one hero glow per page section, never behind body text.
5. Status colors never decorate. If it is not a status, it is not green.
6. Use `color-mix(in oklch, …)` for tints instead of new hard-coded values.

---

## 3. Typography

### 3.1 Typefaces & Loading

| Family | Role | Axes / weights used |
|---|---|---|
| **Geist Sans** (variable) | UI, marketing, headings, numbers | 400, 500, 600 (700 only for the wordmark) |
| **Geist Mono** (variable) | License keys, code, CLI, versions, checksums, shortcuts, eyebrows, dimension readouts | 400, 500 |

```tsx
// src/app/fonts.ts
import { Geist, Geist_Mono } from 'next/font/google'

export const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' })
export const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false })
```

```tsx
// src/app/layout.tsx (excerpt)
<html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
```

Geist Mono is not preloaded globally (NFR-PERF-03). Routes that render code or keys above the fold (`/checkout/success`, `/account/licenses`, `/docs/*`) add a `<link rel="preload">` for the mono file.

### 3.2 Type Scale

Display sizes are fluid (`clamp`) between 375 px and 1440 px viewports. Everything else is fixed for UI stability.

| Token | Size | Line height | Tracking | Weight | Family | Use |
|---|---|---|---|---|---|---|
| `display-2xl` | `clamp(3.5rem, 2.62rem + 3.76vw, 6rem)` · 56→96 | 0.96 | −0.045em | 600 | Sans | Home hero headline only |
| `display-xl` | `clamp(2.75rem, 2.13rem + 2.63vw, 4.5rem)` · 44→72 | 1.00 | −0.04em | 600 | Sans | PDP title, All-Access hero |
| `display-lg` | `clamp(2.25rem, 1.81rem + 1.88vw, 3.5rem)` · 36→56 | 1.05 | −0.035em | 600 | Sans | Section headlines |
| `heading-1` | 2.25rem · 36 | 1.10 | −0.03em | 600 | Sans | App page titles (account, admin, docs H1) |
| `heading-2` | 1.75rem · 28 | 1.15 | −0.025em | 600 | Sans | Section titles |
| `heading-3` | 1.375rem · 22 | 1.25 | −0.02em | 600 | Sans | Large tile titles, card titles |
| `heading-4` | 1.125rem · 18 | 1.35 | −0.012em | 600 | Sans | Small tile titles, dialog titles |
| `body-lg` | 1.125rem · 18 | 1.60 | −0.011em | 400 | Sans | Lead paragraphs |
| `body` | 1rem · 16 | 1.60 | −0.006em | 400 | Sans | Default body, docs prose |
| `body-sm` | 0.875rem · 14 | 1.50 | −0.003em | 400 | Sans | UI text, tile descriptions, table cells |
| `caption` | 0.8125rem · 13 | 1.45 | 0 | 500 | Sans | Labels, helper text, badges |
| `micro` | 0.75rem · 12 | 1.35 | 0.01em | 500 | Sans | Timestamps, legal |
| `eyebrow` | 0.75rem · 12 | 1.20 | 0.08em, uppercase | 500 | **Mono** | Tile and section eyebrows (`BOILERPLATE · V2.3`) |
| `code` | 0.875rem · 14 | 1.70 | 0 | 400 | **Mono** | Code blocks, CLI |
| `key` | 0.9375rem · 15 | 1.50 | 0.02em | 500 | **Mono** | License keys |
| `kbd` | 0.75rem · 12 | 1.00 | 0 | 500 | **Mono** | Shortcuts |
| `metric-hero` | 3rem · 48 | 1.00 | −0.03em | 600 | Sans | One admin hero figure per view (MRR) |
| `metric` | 1.75rem · 28 | 1.10 | −0.02em | 600 | Sans | Stat tile values |

Display fluid formula: `size = min + (max − min) × (100vw − 23.4375rem) / (90rem − 23.4375rem)`, clamped. Check any new display token with the same viewports.

### 3.3 Tailwind v4 Implementation

```css
/* src/styles/typography.css — imported by globals.css */
@theme {
  --text-display-2xl: clamp(3.5rem, 2.62rem + 3.76vw, 6rem);
  --text-display-2xl--line-height: 0.96;
  --text-display-2xl--letter-spacing: -0.045em;
  --text-display-2xl--font-weight: 600;

  --text-display-xl: clamp(2.75rem, 2.13rem + 2.63vw, 4.5rem);
  --text-display-xl--line-height: 1;
  --text-display-xl--letter-spacing: -0.04em;
  --text-display-xl--font-weight: 600;

  --text-display-lg: clamp(2.25rem, 1.81rem + 1.88vw, 3.5rem);
  --text-display-lg--line-height: 1.05;
  --text-display-lg--letter-spacing: -0.035em;
  --text-display-lg--font-weight: 600;

  --text-heading-1: 2.25rem;  --text-heading-1--line-height: 1.1;  --text-heading-1--letter-spacing: -0.03em;  --text-heading-1--font-weight: 600;
  --text-heading-2: 1.75rem;  --text-heading-2--line-height: 1.15; --text-heading-2--letter-spacing: -0.025em; --text-heading-2--font-weight: 600;
  --text-heading-3: 1.375rem; --text-heading-3--line-height: 1.25; --text-heading-3--letter-spacing: -0.02em;  --text-heading-3--font-weight: 600;
  --text-heading-4: 1.125rem; --text-heading-4--line-height: 1.35; --text-heading-4--letter-spacing: -0.012em; --text-heading-4--font-weight: 600;

  --text-body-lg: 1.125rem;   --text-body-lg--line-height: 1.6;  --text-body-lg--letter-spacing: -0.011em;
  --text-body: 1rem;          --text-body--line-height: 1.6;     --text-body--letter-spacing: -0.006em;
  --text-body-sm: 0.875rem;   --text-body-sm--line-height: 1.5;  --text-body-sm--letter-spacing: -0.003em;
  --text-caption: 0.8125rem;  --text-caption--line-height: 1.45; --text-caption--font-weight: 500;
  --text-micro: 0.75rem;      --text-micro--line-height: 1.35;   --text-micro--letter-spacing: 0.01em; --text-micro--font-weight: 500;

  --text-key: 0.9375rem;      --text-key--line-height: 1.5;      --text-key--letter-spacing: 0.02em; --text-key--font-weight: 500;
  --text-metric: 1.75rem;     --text-metric--line-height: 1.1;   --text-metric--letter-spacing: -0.02em; --text-metric--font-weight: 600;
  --text-metric-hero: 3rem;   --text-metric-hero--line-height: 1; --text-metric-hero--letter-spacing: -0.03em; --text-metric-hero--font-weight: 600;
}

@utility eyebrow {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--muted-foreground);
}

@utility license-key {
  font-family: var(--font-mono);
  font-size: var(--text-key);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums slashed-zero;
  font-variant-ligatures: none;
  word-break: break-all;
  user-select: all;
}
```

Usage: `<h1 className="text-display-xl text-balance">`, `<p className="text-body-lg text-muted-foreground text-pretty">`, `<span className="eyebrow">UI Kit · v1.4</span>`.

### 3.4 Numerals & OpenType

| Context | Setting | Why |
|---|---|---|
| Table columns, axis ticks, price lists, activation counts ("3 / 5"), dimension readouts | `tabular-nums` | Digits align vertically |
| Stat tile values and the admin hero figure | Proportional (default) | Tabular digits look loose at large sizes |
| License keys, checksums, order IDs | Mono + `tabular-nums slashed-zero` | Distinguishes `0`/`O` and keeps groups aligned |
| Prices in running text | Proportional; the currency symbol is never split from the amount (`whitespace-nowrap`) | |

### 3.5 Monospace Policy

Geist Mono marks **precision**: anything a user might copy, compare or type. That covers license keys, CLI commands, code, file paths, semver (`v2.3.1`), SHA-256 checksums, order numbers, keyboard shortcuts, device readouts (`393 × 852 · 86%`) and eyebrows (the brand's developer signature). Headlines, marketing copy, prices and buttons are never set in mono.

### 3.6 Typographic Rules

1. Measure: 60–75 characters for prose (`max-w-[45rem]`); tile descriptions ≤ 2 lines on desktop (`line-clamp-2`).
2. `text-wrap: balance` on headings; `text-wrap: pretty` on paragraphs.
3. Sentence case for headings, buttons and labels ("Buy license", not "Buy License"). Uppercase only in `eyebrow`.
4. One `display-*` per section. Never place two display sizes in the same Bento band.
5. Minimum text size 12 px (`micro`); body copy never below 14 px.
6. Link style: `text-brand-text underline-offset-4 decoration-1` underlined on hover inside UI; always underlined in prose.
7. Truncation: product names never truncate on PDPs; in tables use `truncate` + a full-value tooltip.

---

## 4. Layout — Bento Grid 2.0

### 4.1 Definition

Classic Bento layouts are uniform rounded boxes. **Bento Grid 2.0** at Lumira means:

1. **Enumerated asymmetry.** Bands are chosen from a fixed set of compositions (§4.3), and a validator checks the page's balance.
2. **Depth from internal light**, not heavy drop shadows: a top-edge highlight, a hairline and an inner bottom shade (§4.5).
3. **Typography-led tiles** with generous whitespace. A tile states one idea.
4. **Concentric radii** everywhere (§1.3).
5. **Living content in a minority of tiles.** At most one video or live element per band.

### 4.2 Grid System

| Viewport | Columns | Row unit `--bento-row` | Gap `--bento-gap` | Tile padding |
|---|---|---|---|---|
| < 768 px | 4 | `auto` (per-kind min-heights, §4.8) | 12 px | 20 px |
| 768–1023 px | 6 | 128 px | 16 px | 24 px |
| ≥ 1024 px | 12 | `clamp(8.5rem, 3.58rem + 7.69vw, 10.5rem)` (136 → 168 px) | 20 px | 24 px (hero tiles 32 px) |

```css
/* src/styles/bento.css */
:root { --bento-gap: 0.75rem; --bento-row: auto; }
@media (min-width: 48rem) { :root { --bento-gap: 1rem; --bento-row: 8rem; } }
@media (min-width: 64rem) { :root { --bento-gap: 1.25rem; --bento-row: clamp(8.5rem, 3.58rem + 7.69vw, 10.5rem); } }
```

```tsx
<div className="grid grid-cols-4 gap-(--bento-gap) md:grid-cols-6 md:auto-rows-(--bento-row) lg:grid-cols-12">…</div>
```

### 4.3 Composition Rules

**Band presets** (a band is a full-width row group; spans are desktop columns)

| Preset | Desktop split | Band rows | Character | Tablet (6 col) | Mobile (4 col) |
|---|---|---|---|---|---|
| `lead-left` | 8 · 4 | 2–3 | Hero + support | 4 · 2 | Stack |
| `lead-right` | 4 · 8 | 2–3 | Mirror | 2 · 4 | Stack |
| `golden-left` | 7 · 5 | 2 | Calmer asymmetry (7:5 ≈ √2 : 1) | 4 · 2 | Stack |
| `golden-right` | 5 · 7 | 2 | Mirror | 2 · 4 | Stack |
| `feature-left` | 6 · 3 · 3 | 2 | One feature + two supports | 6 / 3 · 3 | Stack (stats pair 2 · 2) |
| `feature-right` | 3 · 3 · 6 | 2 | Mirror | 3 · 3 / 6 | Stack |
| `stacked-right` | 7 · 5 (two 1-row tiles) | 2 | Hero + stacked pair | 4 · 2 (stacked) | Stack |
| `stacked-left` | 5 (two 1-row tiles) · 7 | 2 | Mirror | 2 (stacked) · 4 | Stack |
| `centered` | 3 · 6 · 3 | 2 | Symmetric focus; CTA bands only | 6 / 3 · 3 | Stack |
| `rhythm` | 4 · 4 · 4 | 1–2 | Equal beats (stats, logos); once per page | 2 · 2 · 2 | 2 · 2 + 4 |

**Rules** (R1–R5 are enforced by `validateBands`)

| # | Rule |
|---|---|
| R1 | Column spans in a band sum to **12**. Band height is 1, 2 or 3 rows; every tile spans the band height, except stacked composites whose children sum to it. |
| R2 | At most **4 tiles** per band and **1 hero** tile, whose area is **≥ 2×** the smallest tile in the band. |
| R3 | Consecutive bands never repeat a preset, so `lead-*` and `golden-*` bands alternate their heavy side. |
| R4 | **Balance**: for each consecutive band pair, the mean of their weighted centroids lies within **6 ± 0.5 columns** (grid center on a 0–12 axis). Weight = columns × rows × emphasis. Emphasis: `allAccessPromo` 1.2 · `featuredProduct`, `video` 1.0 · `stat` 0.8 · `testimonial` 0.7 · `changelogTeaser`, `docsTeaser`, `stackBadges` 0.6. |
| R5 | `rhythm` at most once per page; `centered` only for CTA bands. |
| R6 | DOM order = visual order. `grid-auto-flow: dense` is forbidden, because keyboard and screen-reader order must match what users see. |
| R7 | One brand-filled tile per viewport (§2.7). |

```ts
// src/lib/bento/validate.ts — used by Sanity validation and at render time (fallback preset on failure)
export type TileKind =
  | 'featuredProduct' | 'video' | 'allAccessPromo' | 'stat'
  | 'testimonial' | 'changelogTeaser' | 'docsTeaser' | 'stackBadges'

export type BandTile = { kind: TileKind; cols: number; rows: number; hero?: boolean; stack?: BandTile[] }
export type Band = { preset: string; rows: 1 | 2 | 3; tiles: BandTile[] }

const EMPHASIS: Record<TileKind, number> = {
  allAccessPromo: 1.2, featuredProduct: 1, video: 1, stat: 0.8,
  testimonial: 0.7, changelogTeaser: 0.6, docsTeaser: 0.6, stackBadges: 0.6,
}

const mass = (t: BandTile): number =>
  t.stack
    ? t.stack.reduce((sum, c) => sum + t.cols * c.rows * EMPHASIS[c.kind], 0)
    : t.cols * t.rows * EMPHASIS[t.kind]

/** Weighted horizontal centroid of a band on a 0–12 axis (6 = page center). */
export function centroid(band: Band): number {
  let x = 0, moment = 0, total = 0
  for (const t of band.tiles) {
    const m = mass(t)
    moment += (x + t.cols / 2) * m
    total += m
    x += t.cols
  }
  return moment / total
}

export function validateBands(bands: Band[]): string[] {
  const errors: string[] = []
  const area = (t: BandTile) => t.cols * t.rows

  bands.forEach((band, i) => {
    const cols = band.tiles.reduce((s, t) => s + t.cols, 0)
    if (cols !== 12) errors.push(`band ${i}: columns sum to ${cols}, expected 12`)
    if (band.tiles.length > 4) errors.push(`band ${i}: more than 4 tiles`)

    for (const t of band.tiles) {
      const rows = t.stack ? t.stack.reduce((s, c) => s + c.rows, 0) : t.rows
      if (rows !== band.rows) errors.push(`band ${i}: a tile spans ${rows} rows, band has ${band.rows}`)
    }

    const heroes = band.tiles.filter((t) => t.hero)
    if (heroes.length > 1) errors.push(`band ${i}: more than one hero tile`)
    const hero = heroes[0]
    if (hero && area(hero) < 2 * Math.min(...band.tiles.map(area))) {
      errors.push(`band ${i}: hero must be at least 2× the smallest tile`)
    }

    const prev = bands[i - 1]
    if (prev) {
      if (prev.preset === band.preset) errors.push(`band ${i}: repeats preset "${band.preset}"`)
      const mean = (centroid(prev) + centroid(band)) / 2
      if (Math.abs(mean - 6) > 0.5) errors.push(`bands ${i - 1}–${i}: centroid ${mean.toFixed(2)} is outside 6 ± 0.5`)
    }
  })

  if (bands.filter((b) => b.preset === 'rhythm').length > 1) errors.push('the rhythm preset is used more than once')
  return errors
}
```

**Worked example (home hero):** Band 1 `lead-left`, 2 rows: `featuredProduct` 8 (hero) + `stat` 4 → centroid 5.71. Band 2 `golden-right`, 2 rows: `testimonial` 5 + `video` 7 → centroid 6.50. Pair mean 6.11: **balanced**. Replacing band 2 with `golden-left` (`video` 7 + `docsTeaser` 5 → 5.30) gives a mean of 5.51, which is rejected because both bands lean left.

### 4.4 Tile Anatomy

```
┌─ radius 24 ───────────────────────────────────────────────────────────┐
│  EYEBROW · MONO 12 (muted)                                  [badge]    │  ← padding 24 (hero 32)
│  Title: heading-3 (large tiles) / heading-4 (small tiles)              │
│  Description: body-sm, muted, ≤ 2 lines                                │
│                                                                        │  ← whitespace ≥ 24
│  ┌─ media: radius 16 (= 24 − 8 inset) ───────────────────────┐        │
│  │                                                            │        │
│  └────────────────────────────────────────────────────────────┘        │
│  Footer link: "View template →" (caption, brand-text)                  │
└────────────────────────────────────────────────────────────────────────┘
```

| Media mode | Rule |
|---|---|
| `inset` | 8 px inset, radius 16 (concentric). Default on mobile. |
| `bleed` | Screenshot runs off the bottom or right edge and is clipped by the tile radius (`overflow-hidden`). Desktop signature look. |
| `cover` | Full-tile image with a scrim (`linear-gradient(to top, oklch(0.13 0.007 264 / 0.72), transparent 60%)`); text on it must reach ≥ 4.5:1. |

| Tile kind | Content | Min span (desktop) |
|---|---|---|
| `featuredProduct` | Eyebrow (line · version), title, value prop, price-from, `bleed` screenshot, hover video | 5 × 2 |
| `stat` | Value (`text-metric`, proportional figures), label (`caption`), optional sparkline | 3 × 1 |
| `testimonial` | Quote (`body-lg`), 32 px avatar, name and role (`caption`), company mark | 4 × 2 |
| `stackBadges` | Stack logos with versions (mono) | 4 × 1 |
| `changelogTeaser` | Latest 3 releases: version pill, title, relative date | 4 × 2 |
| `docsTeaser` | Shiki snippet with copy button + docs link | 5 × 2 |
| `allAccessPromo` | The one brand-filled tile: plan price, live asset count, CTA; border beam allowed | 4 × 2 |
| `video` | Muted loop with poster and a visible **pause** control (WCAG 2.2.2 for motion longer than 5 s) | 5 × 2 |

### 4.5 Surfaces, Depth & Internal Shadows

The shadow stack (tokens in §2.3) models one top-left light:

1. `inset 0 1px 0 0 var(--bento-highlight)`: the top edge catching light.
2. `inset 0 -24px 48px -32px var(--bento-shade)`: a faint inner shade toward the bottom (the "bowl").
3. `0 1px 2px`: contact shadow.
4. `0 8px 24px -12px`: ambient lift (light theme only; dark theme relies on lightness steps).

```css
/* src/styles/bento.css (continued) */
@utility bento-surface {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--radius-bento);
  background: var(--card);
  border: 1px solid var(--bento-border);
  box-shadow: var(--bento-shadow);
}

/* Soft top-left ambient light inside the tile */
@utility bento-light {
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--foreground) 3%, transparent), transparent 60%);
  }
}
```

| State (interactive tiles only) | Treatment |
|---|---|
| Hover (`pointer: fine`) | `shadow-raised`; `y: −2` with the `snappy` spring; border → `color-mix(in oklch, var(--foreground) 14%, transparent)`; spotlight on (§4.7) |
| Focus-visible | The wrapping `<Link>` draws a 2 px `--ring` outline with 2 px offset, following the tile radius |
| Active | `scale: 0.99` with the `press` spring |
| Static tiles | No hover response. Never fake affordance. |

### 4.6 Background Blur Rules

| Surface | Recipe | Fallback |
|---|---|---|
| Header (after 8 px scroll) | `bg-background/72 backdrop-blur-xl backdrop-saturate-150 border-b border-border/60` | `bg-background/95` |
| Popover, dropdown, select, ⌘K | `bg-popover/85 backdrop-blur-xl shadow-overlay` | `bg-popover` |
| Preview toolbar, mobile buy bar | `bg-background/72 backdrop-blur-xl` | `bg-background/95` |
| Dialog / sheet overlay | `bg-black/40 dark:bg-black/60` + `backdrop-blur-[2px]` at most | No blur |
| **Never blurred** | Bento tiles, cards in scrolling grids, the preview stage, tables | — |

- **Budget:** at most **2** active `backdrop-filter` surfaces per viewport (normally header + one overlay).
- `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)` → opaque fallbacks.

### 4.7 Light Effects

| Effect | Where | Implementation | Guardrails |
|---|---|---|---|
| **Spotlight** | Interactive tiles (`data-spotlight`) | One delegated `pointermove` listener per grid writes `--mx` / `--my` in a `requestAnimationFrame` batch; `::after` paints `radial-gradient(360px circle at var(--mx) var(--my), var(--glow), transparent 65%)` | `(hover: hover) and (pointer: fine)` only; off under reduced motion |
| **Border beam** | `allAccessPromo` only | Conic-gradient border through `mask-composite: exclude`, 6 s linear loop | One per page; paused off-screen (IntersectionObserver); off under reduced motion |
| **Hero glow** | Top of home and PDP heroes | `radial-gradient(60% 50% at 15% 0%, var(--glow), transparent 70%)` | One per section; never behind body text |
| **Grain** (optional) | Home hero canvas | Static 2.5 %-opacity SVG noise image | Never animated |

```css
[data-spotlight]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 0%), var(--glow), transparent 65%);
  opacity: 0;
  transition: opacity 200ms ease-out;
}
@media (hover: hover) and (pointer: fine) {
  [data-spotlight]:hover::after { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  [data-spotlight]::after { display: none; }
}
```

### 4.8 Responsive Collapse

- Tablet uses the preset mappings in §4.3. Tiles that would fall under 2 columns wrap to their own row.
- Mobile is one column in DOM order; `stat` tiles pair as 2 · 2. Row height becomes `auto` with min-heights: `featuredProduct` / `video` 280 px, `testimonial` 200 px, `stat` 132 px, teasers content-sized.
- Below `md`, media switches from `bleed` to `inset`, tile titles drop one step (`heading-3` → `heading-4`) and tile radius becomes 20 px.

---

## 5. Component Architecture (shadcn/ui, customized)

### 5.1 Principles & File Structure

1. **Own the code.** shadcn components are copied into `src/components/ui` and patched. Upstream updates are merged by hand; every patch is listed in `src/components/ui/PATCHES.md`.
2. **Restyle, never re-behave.** Radix accessibility and keyboard behavior stay intact.
3. **Brand compositions live apart** from primitives (`src/components/lumira`).
4. **Keep `data-slot` attributes**; CSS hooks and Playwright selectors use them.

```
src/components/
  ui/        shadcn primitives (patched): button, badge, card, input, field, dialog, sheet,
             popover, dropdown-menu, select, tabs, toggle-group, tooltip, command, table,
             sidebar, chart, sonner, skeleton, accordion, kbd, empty, progress, avatar, separator
  lumira/    BentoGrid, BentoTile, ProductCard, PriceTag, VersionPill, StackBadge,
             LicenseKey, CopyButton, SectionHeader, ThemedImage, PromoBanner
  motion/    MotionProvider, PageTransition, Reveal, NumberTicker
  preview/   Live Preview player (§7.11)
  admin/     StatTile, RevenueChart, MrrWaterfall, FunnelChart, DataTable, DateRangePicker
```

Generated by `pnpm dlx shadcn@latest init -b radix -p vega --no-monorepo --no-rtl`. shadcn 4.x replaced the `new-york` style with presets on a choice of primitive library; **Radix + Vega** is the classic new-york look and keeps the Radix behavior this guide relies on. Components import from the unified `radix-ui` package, and `cn` comes from the `cn` package (shadcn's replacement for clsx + tailwind-merge).

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-vega",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

**Patch checklist** (run for every newly added shadcn component):

1. Radius → the token in §1.3 and §5.3.
2. Focus → `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. This replaces shadcn's translucent `ring-ring/50`, which does not reach 3:1 on every surface.
3. Borders → `border-border` (decorative) or `border-input` (form controls).
4. Overlays → glass recipe (§4.6) + `shadow-overlay` + motion (§6.4).
5. Hit area ≥ 24 × 24 px; primary actions ≥ 44 px tall.
6. Visual snapshot in light and dark (Playwright).

### 5.2 Border, Radius & Blur Mapping

| Surface | Radius | Border | Background | Shadow |
|---|---|---|---|---|
| Bento tile | `rounded-bento` (24 / 20) | `border-bento-border` | `bg-card` | `shadow-bento` |
| Card (lists, account) | `rounded-xl` (16) | `border-bento-border` | `bg-card` | `shadow-bento` |
| Button | `rounded-md` (10); `sm` 8; `lg` 12 | Variant-dependent | Variant | Inner highlight |
| Input, select trigger | `rounded-md` (10) | `border-input` (3:1) | `bg-transparent` on cards, `bg-card` on canvas | none |
| Popover, dropdown, select content | `rounded-lg` (12) | via `shadow-overlay` ring | `bg-popover/85` + blur | `shadow-overlay` |
| Dialog, ⌘K | `rounded-2xl` (20) | via `shadow-modal` ring | `bg-popover` | `shadow-modal` |
| Bottom sheet | top corners 24 | top hairline | `bg-popover` | `shadow-modal` |
| Tooltip | `rounded-sm` (8) | none | inverse (`bg-foreground text-background`) | none |
| Badge (status, stack) | `rounded-full` | subtle or none | subtle tokens | none |
| Version pill | `rounded-md` | `border-border` | `bg-muted` | none |
| Kbd | `rounded-xs` (6) | `border-border` | `bg-muted` | `inset 0 -1px 0 var(--border)` |

### 5.3 Component Specifications

| Component | Lumira specification |
|---|---|
| **Button** | Variants `default` (ink), `brand`, `secondary`, `outline`, `ghost`, `link`, `destructive`. Sizes `sm` 32 px, `default` 40 px, `lg` 48 px (all purchase CTAs), `icon` 40, `icon-sm` 32. Top inner highlight on filled variants. Motion press (§5.4). Loading state keeps the width and swaps the label for a 16 px spinner + "Processing…" (screen-reader text). |
| **Badge** | 24 px tall pill, `caption`. Variants `neutral`, `brand`, `success`, `warning`, `info`, `danger` (subtle background + text token + 12 px icon), `version` (mono, `rounded-md`, bordered), `stack` (14 px logo + label). |
| **Card → BentoTile** | §5.5. Slots: `eyebrow`, `title`, `description`, `media`, `footer`. |
| **Input / Textarea / Select** | 40 px (48 px in checkout-adjacent forms), `border-input`, placeholder `muted-foreground` (≥ 4.5:1), error = `border-destructive` + message linked by `aria-describedby`. |
| **Field** | Label `caption` weight 500; description `caption` muted; 6 px vertical rhythm; required marker is text ("Required"), not only an asterisk. |
| **Dialog** | `max-w-[30rem]` (confirm) / `max-w-[40rem]` (forms); padding 24; motion `reveal` (§6.4.3); exit 120 ms. The destructive confirm button sits on the right and is never auto-focused. |
| **Sheet** | Mobile: bottom sheet, 36 × 4 px drag handle, drag to dismiss (§6.4.4). Desktop: side sheet 420 px. |
| **Popover / DropdownMenu / Select content** | Glass recipe; items 32 px, `rounded-sm`, highlighted `bg-accent`; animation origin from `--radix-*-content-transform-origin`. |
| **Tooltip** | Inverse colors, 12 px text, 400 ms delay, no arrow, never the only home of essential information. |
| **Tabs** | Underline style for content tabs, pill style for filters; active indicator is a Motion `layoutId` element (`snappy`). |
| **ToggleGroup (segmented)** | `bg-muted rounded-md p-1`; items 32 px `rounded-sm`; the active indicator (`bg-card shadow-sm`) glides via `layoutId`. `type="single"` with roving focus; used for the Live Preview device control. |
| **Command (⌘K)** | Dialog `w-[40rem]`, 48 px input, 40 px items, grouped results (Products, Docs, Changelog, Actions), `Kbd` hints. |
| **Table / DataTable** | Sticky header, 44 px rows, `tabular-nums`, numbers right-aligned, hairline dividers, hover `bg-accent/50`, column visibility, CSV export (admin). |
| **Sidebar** | 256 px, collapsed 56 px (icons); active item `bg-accent` + 2 px `--brand` left indicator. |
| **Chart** | shadcn `ChartContainer` + Recharts using `var(--chart-n)`; marks per §5.11. |
| **Toast (Sonner)** | Bottom-right on desktop, top-center on mobile; glass; status icon + text; `aria-live` polite (assertive for errors). |
| **Skeleton** | `bg-muted` with a 1.6 s shimmer; static under reduced motion; matches final geometry exactly (CLS budget). |
| **Accordion** | FAQ: hairline dividers, `heading-4` triggers, plus icon rotating 45°, height via the CSS grid-rows technique with spring easing (§6.4.9). |
| **Progress (usage meter)** | 6 px track in the lighter step of the same ramp (`brand-subtle`), fill `brand`; ≥ 80 % → `warning`, 100 % → `destructive`, always with text ("5 of 5 activations used") and an icon at the limit. |
| **Kbd** | Mono 12 px, 20 px tall, `rounded-xs`, bordered. |
| **Empty** | 48 px icon tile (`rounded-lg`), `heading-4` title, `body-sm` muted description, one primary action. |

### 5.4 Button Implementation

```tsx
// src/components/ui/button.tsx — Lumira patch of shadcn new-york
'use client'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[color,background-color,border-color,box-shadow] duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.14),0_1px_2px_0_oklch(0_0_0/0.14)] hover:bg-primary/90',
        brand:
          'bg-brand text-brand-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.2),0_1px_2px_0_oklch(0_0_0/0.14)] hover:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.2),0_8px_24px_-8px_var(--brand)]',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto px-0 text-brand-text underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-[13px]',
        default: 'h-10 rounded-md px-4 text-sm',
        lg: 'h-12 rounded-lg px-6 text-[15px]',
        icon: 'size-10 rounded-md',
        'icon-sm': 'size-8 rounded-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)

  // Links styled as buttons: CSS spring press (generated linear() easing, §6.6). No JS needed.
  if (asChild) return <Slot data-slot="button" className={cn(classes, 'pressable')} {...props} />

  return (
    <m.button
      data-slot="button"
      className={classes}
      whileTap={{ scale: 0.97 }}
      transition={spring.press}
      {...(props as React.ComponentProps<typeof m.button>)}
    />
  )
}
```

```css
/* CSS press for asChild buttons and other non-Motion pressables */
@utility pressable {
  transition:
    color 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out,
    box-shadow 200ms ease-out,
    transform var(--spring-snappy-duration) var(--spring-snappy);
  &:active:not(:disabled) { transform: scale(0.97); }
  @media (prefers-reduced-motion: reduce) { &:active { transform: none; } }
}
```

### 5.5 BentoGrid & BentoTile

```tsx
// src/components/lumira/bento.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Literal class maps: Tailwind can only generate classes it can see in source.
const LG_COLS = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 12: 'lg:col-span-12' } as const
const MD_COLS = { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4', 6: 'md:col-span-6' } as const
const BASE_COLS = { 2: 'col-span-2', 4: 'col-span-4' } as const
const ROWS = { 1: 'md:row-span-1', 2: 'md:row-span-2', 3: 'md:row-span-3' } as const

const tile = cva('bento-surface bento-light group/tile flex flex-col', {
  variants: {
    padding: { none: 'p-0', md: 'p-5 md:p-6', lg: 'p-6 md:p-8' },
    tone: {
      default: '',
      brand: 'bg-brand text-brand-foreground [--bento-border:oklch(1_0_0/0.14)]',
      inverse: 'bg-primary text-primary-foreground',
    },
    interactive: {
      true: 'transition-[box-shadow,border-color] duration-200 hover:shadow-raised hover:border-[color-mix(in_oklch,var(--foreground)_14%,transparent)]',
      false: '',
    },
  },
  defaultVariants: { padding: 'md', tone: 'default', interactive: false },
})

export function BentoGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bento-grid"
      className={cn('grid grid-cols-4 gap-(--bento-gap) md:grid-cols-6 md:auto-rows-(--bento-row) lg:grid-cols-12', className)}
      {...props}
    />
  )
}

type Span = { base?: keyof typeof BASE_COLS; md?: keyof typeof MD_COLS; lg: keyof typeof LG_COLS; rows?: keyof typeof ROWS }

export function BentoTile({
  span, className, padding, tone, interactive, ...props
}: React.ComponentProps<'article'> & VariantProps<typeof tile> & { span: Span }) {
  return (
    <article
      data-slot="bento-tile"
      data-spotlight={interactive ? '' : undefined}
      className={cn(
        BASE_COLS[span.base ?? 4], span.md && MD_COLS[span.md], LG_COLS[span.lg], span.rows && ROWS[span.rows],
        tile({ padding, tone, interactive }),
        className,
      )}
      {...props}
    />
  )
}
```

### 5.6 LicenseKey Component

| Aspect | Specification |
|---|---|
| Container | `rounded-lg border border-bento-border bg-muted/60 px-3 py-2`; `ph-no-capture` (excluded from analytics and replays) |
| Text | `license-key` utility (Geist Mono 15/1.5, +0.02em, tabular, slashed zero, no ligatures, `user-select: all`, breaks anywhere) |
| Masked state (default) | `••••••••-••••-••••-••••-••••••••4d51` (last 4 characters from `key_short`); accessible name "License key ending in 4d51" |
| Reveal | Ghost icon button (`aria-pressed`) → Server Action `revealLicenseKey(id)` (re-checks ownership, writes `license_events(revealed)`) → characters crossfade from `blur(4px)` to sharp with the `reveal` spring |
| Copy | Icon button "Copy license key". A masked copy reveals first. The icon swaps Copy → Check with the `bouncy` spring (scale 0.6 → 1); a live region announces "License key copied"; it resets after 2 s |
| Status | Adjacent badge: `Active` (success), `Not activated` (neutral), `Disabled` or `Expired` (danger), always with an icon |
| Case | Never transform the key's case; it is shown exactly as issued by Lemon Squeezy |
| Hyphens | Rendered in `--muted-foreground` so the character groups scan easily |

```tsx
// src/components/lumira/license-key.tsx (excerpt)
'use client'
import { useState, useTransition } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/lumira/copy-button'
import { revealLicenseKey } from '@/app/(app)/account/licenses/actions'
import { spring } from '@/lib/motion/springs'

export function LicenseKey({ id, last4 }: { id: string; last4: string }) {
  const [plain, setPlain] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const reveal = () => start(async () => setPlain(plain ? null : await revealLicenseKey(id)))

  return (
    <div className="ph-no-capture flex items-center gap-2 rounded-lg border border-bento-border bg-muted/60 px-3 py-2">
      <KeyRound aria-hidden className="size-4 text-muted-foreground" />
      <AnimatePresence mode="popLayout" initial={false}>
        <m.code
          key={plain ? 'plain' : 'masked'}
          className="license-key flex-1"
          aria-label={plain ? 'License key' : `License key ending in ${last4}`}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={spring.reveal}
        >
          {plain ?? `••••••••-••••-••••-••••-••••••••${last4}`}
        </m.code>
      </AnimatePresence>
      <Button variant="ghost" size="icon-sm" onClick={reveal} aria-pressed={!!plain} disabled={pending}
        aria-label={plain ? 'Hide license key' : 'Reveal license key'}>
        {plain ? <EyeOff /> : <Eye />}
      </Button>
      <CopyButton label="Copy license key" getValue={async () => plain ?? (await revealLicenseKey(id))} />
    </div>
  )
}
```

### 5.7 Iconography

- **Lucide** (`lucide-react`, shadcn default). `strokeWidth={1.75}` for 16–20 px UI icons and `1.5` for icons ≥ 24 px. Sizes: 16 (inline, buttons), 20 (navigation), 24 (empty states, tile icons).
- Decorative icons are `aria-hidden`; icon-only buttons always carry an `aria-label`.
- Stack logos (Next.js, React, Tailwind CSS, etc.) use the vendors' official monochrome marks from their press kits, rendered in `currentColor` at 14 px inside `stack` badges and used in accordance with each brand's guidelines.

### 5.8 Clerk Theming

Clerk components read Lumira's shadcn variables through Clerk's `shadcn` base theme. Nothing is duplicated.

```tsx
// src/app/layout.tsx (excerpt)
import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/themes'

<ClerkProvider
  appearance={{
    baseTheme: shadcn,
    cssLayerName: 'clerk',
    variables: {
      borderRadius: 'var(--radius)',
      fontFamily: 'var(--font-geist-sans)',
      fontFamilyButtons: 'var(--font-geist-sans)',
    },
    elements: {
      cardBox: 'rounded-bento border border-bento-border shadow-bento',
      formButtonPrimary: 'h-10 rounded-md text-sm font-medium',
      formFieldInput: 'h-10 rounded-md border-input',
    },
  }}
>
```

```css
/* First line of globals.css: let Tailwind utilities override Clerk styles */
@layer theme, base, clerk, components, utilities;
```

Sign-in and sign-up pages sit on the Lumira canvas with the hero glow, centered in a 440 px column, with the wordmark above. Clerk's `<UserProfile />` is embedded in `/account/settings` inside a `rounded-bento` card.

### 5.9 Fumadocs Theming

```css
/* src/app/docs/docs.css (imported by the docs layout) */
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

/* Map Fumadocs tokens to Lumira tokens. Same specificity, later wins in both themes. */
:root, .dark {
  --color-fd-background: var(--background);
  --color-fd-foreground: var(--foreground);
  --color-fd-card: var(--card);
  --color-fd-card-foreground: var(--card-foreground);
  --color-fd-popover: var(--popover);
  --color-fd-popover-foreground: var(--popover-foreground);
  --color-fd-muted: var(--muted);
  --color-fd-muted-foreground: var(--muted-foreground);
  --color-fd-secondary: var(--secondary);
  --color-fd-secondary-foreground: var(--secondary-foreground);
  --color-fd-accent: var(--accent);
  --color-fd-accent-foreground: var(--accent-foreground);
  --color-fd-border: var(--border);
  --color-fd-ring: var(--ring);
  --color-fd-primary: var(--brand-text);
  --color-fd-primary-foreground: var(--brand-foreground);
}
```

Docs rules: prose uses the `body` token at a 45 rem measure; code blocks use `rounded-lg`, the Shiki dual theme and mono 14/1.7 with a copy button; callouts use subtle status tokens with icons; the sidebar reuses the account sidebar's active indicator (2 px brand bar); version badges ("Added in v2.1") are `version` pills.

### 5.10 Email Design (React Email)

Email clients do not support OKLCH or CSS variables, so emails use the **hex** equivalents from §2.1.

| Token | Light | Dark (`prefers-color-scheme` capable clients) |
|---|---|---|
| Canvas | `#f9fafc` | `#06070a` |
| Card | `#ffffff`, 1 px `#e3e5e9` border, radius 16 | `#0d0e12`, border `#1f2126` |
| Text / muted | `#090b0f` / `#696d76` | `#f9fafc` / `#a1a5ac` |
| Primary button | `#0f1115` background, `#fcfcfe` text, radius 10, 44 px tall (padding-based) | `#f9fafc` background, `#090b0f` text |
| Link | `#4643c4` | `#b3bdfb` |
| License key block | `#f3f4f7` background, `#e3e5e9` border, radius 12, padding 16 × 20 | `#191c21` background |

- **Layout:** 600 px container, 32 px padding, logo 28 px tall, one card per asset (the email's "Bento": two columns ≥ 480 px through tables, stacked below).
- **Type:** `font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` (Geist loaded with React Email's `<Font>`; clients that ignore web fonts fall back). Mono: `'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Body 15/24; headings 22/28 at weight 600.
- **Head:** `<meta name="color-scheme" content="light dark">` and `<meta name="supported-color-schemes" content="light dark">`; a preheader through `<Preview>` ("Your SaaS Starter Team license and download are ready").
- **Accessibility:** `lang="en"`, `role="presentation"` on layout tables, descriptive link text ("Download SaaS Starter v2.3.1"), alt text on every image, contrast as §2.5.
- **Footer:** Lumira legal line, "Lemon Squeezy is our Merchant of Record" + receipt link, support address; unsubscribe link only on `release-available`.

```tsx
// emails/components/license-key-block.tsx
import { Section, Text } from '@react-email/components'

export function LicenseKeyBlock({ value }: { value: string }) {
  return (
    <Section style={{ background: '#f3f4f7', border: '1px solid #e3e5e9', borderRadius: 12, padding: '16px 20px' }}>
      <Text style={{ margin: 0, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#696d76', fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
        License key
      </Text>
      <Text style={{ margin: '6px 0 0', fontSize: 15, letterSpacing: '0.02em', color: '#090b0f', wordBreak: 'break-all', fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
        {value}
      </Text>
    </Section>
  )
}
```

### 5.11 Admin Data Components

| Component | Specification |
|---|---|
| **StatTile** | Contract: `label` (sentence case, no colon) · `value` (`text-metric`, proportional figures, auto-compact: 1,284 / 12.9K / $4.2M) · `delta` (signed, "vs previous 30 days", colored by direction × goodness: refund rate up = `destructive`, revenue up = `success`, always with an ↑/↓ icon) · `trend` (12-point sparkline, `muted-foreground` with the current period in `--chart-1`). |
| **Hero figure** | Exactly one per view (MRR on Overview): `text-metric-hero`, same Geist Sans, never a display or serif face. |
| **Line / area** | 2 px lines, round joins and caps; area fill = series color at 10 % opacity; crosshair + tooltip on hover. |
| **Bars / columns** | ≤ 24 px thick; 4 px radius on the data end, square at the baseline (`radius={[4, 4, 0, 0]}`); 2 px `--card`-colored gaps between stacked segments and adjacent bars. |
| **Axes & grid** | One y-axis only (never dual-axis); hairline horizontal gridlines in `--border`; ticks rounded and thousands-separated; axis text `micro` in `muted-foreground`. |
| **Legends & labels** | Legend for ≥ 2 series; selective direct labels (endpoints, extremes); text always in text tokens, never the series color. |
| **Table view** | Every chart has a "View as table" toggle (the relief channel from §2.6) and an `aria-describedby` summary sentence. |
| **Funnel** | Horizontal bars in the ordinal Lumen ramp (§2.6) with the drop-off % between steps as text. |
| **MRR waterfall** | Diverging: positive movements `--chart-1`, negative red, zero baseline in graphite. |
| **Date range** | Preset rows (Today, 7d, 30d, 90d, 12m, MTD) with a 16 px check on the selected row; custom range behind a hairline; persisted in the URL. |
| **DataTable** | TanStack Table + shadcn Table; 44 px rows; sticky header; `tabular-nums`; status cells use status badges (icon + label). |

---

## 6. Motion Guidelines

### 6.1 Principles

1. **Physics, not timelines.** Interactive motion uses springs: they are interruptible and carry velocity when a gesture reverses mid-flight.
2. **Near-critical damping by default** (ζ 0.8–1.0). Premium reads as *controlled*. Visible overshoot (ζ ≈ 0.55) is reserved for success confirmations.
3. **Exits are faster than entrances** and use short tweens (100–160 ms, ease-in). Springs on exit add latency without adding meaning.
4. **Animate `transform`, `opacity` and `clip-path`.** Documented exceptions: the Live Preview frame box (§7.4), the header height (threshold-driven, not scroll-linked) and accordion content height.
5. **Routes change through the View Transitions API** (native snapshots via React `<ViewTransition>`). Motion handles in-page interaction.
6. **Motion must say something:** hierarchy (direction), continuity (shared elements) or causality (press → response). The only decorative loop is the All-Access border beam.
7. **Reduced motion is a designed variant** (§6.8), not an afterthought.

### 6.2 Spring Tokens

Damping ratio ζ = c / (2·√(k·m)). Overshoot = e^(−πζ/√(1−ζ²)) for ζ < 1. Settle time is measured by simulating the spring to within 2 % of its target.

| Token | Stiffness (k) | Damping (c) | Mass (m) | ζ | Overshoot | Settle (2 %) | Use |
|---|---|---|---|---|---|---|---|
| `press` | 700 | 35 | 0.5 | 0.94 | 0 % | 136 ms | Tap feedback on buttons and tiles |
| `snappy` | 500 | 32 | 0.8 | 0.80 | 1.5 % | 150 ms | Toggles, tab and segmented indicators, popovers, hover lift, header condense |
| `smooth` | 300 | 30 | 1 | 0.87 | 0.4 % | 251 ms | Sheets, device-frame resize, layout shifts, View Transition morphs and slides |
| `reveal` | 260 | 26 | 1 | 0.81 | 1.4 % | 236 ms | Dialogs, ⌘K, license key reveal |
| `gentle` | 170 | 26 | 1 | 1.00 | 0 % | 445 ms | Scroll entrances, number tickers, theme reveal |
| `bouncy` | 400 | 22 | 1 | 0.55 | 12.6 % | 292 ms | Success confirmations only (copied ✓, activation success) |

**Tuning rules:** change **stiffness** for speed, **damping** for bounce, **mass** for weight (`press` uses 0.5 for a feather-light tap; other tokens keep 1). Never ship a spring with ζ < 0.5 or a 2 % settle time above 500 ms.

### 6.3 Setup

```ts
// src/lib/motion/springs.ts
import type { Transition } from 'motion/react'

export const spring = {
  press:  { type: 'spring', stiffness: 700, damping: 35, mass: 0.5 },
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.8 },
  smooth: { type: 'spring', stiffness: 300, damping: 30, mass: 1 },
  reveal: { type: 'spring', stiffness: 260, damping: 26, mass: 1 },
  gentle: { type: 'spring', stiffness: 170, damping: 26, mass: 1 },
  bouncy: { type: 'spring', stiffness: 400, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>

/** Exits: short, ease-in, no spring. */
export const exit = { duration: 0.14, ease: [0.4, 0, 1, 1] } as const satisfies Transition
```

```tsx
// src/components/motion/motion-provider.tsx
'use client'
import { LazyMotion, MotionConfig } from 'motion/react'
import { spring } from '@/lib/motion/springs'

// Features (domMax: gestures, drag, layout) load asynchronously after hydration,
// so `m.*` components add almost nothing to first-load JS (NFR-PERF-04).
const loadFeatures = () => import('@/lib/motion/features').then((mod) => mod.default)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring.smooth}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
```

```ts
// src/lib/motion/features.ts
import { domMax } from 'motion/react'
export default domMax
```

- Always import `* as m from 'motion/react-m'` and render `m.div`, `m.button`, etc. `strict` throws if a full `motion.*` component slips in.
- `reducedMotion="user"` makes Motion skip transform and layout animations when the OS asks for reduced motion; opacity still animates.

### 6.4 Interaction Recipes

| Interaction | Token | Properties | Notes |
|---|---|---|---|
| Button press | `press` | `scale` 1 → 0.97 (icon buttons 0.92) | Never below 0.96 on text buttons |
| Primary CTA hover | `snappy` | `y` 0 → −1 | Purchase CTAs only |
| Interactive tile hover | `snappy` | `y` 0 → −2 + `shadow-raised` | `pointer: fine` only |
| Tab / segmented / device indicator | `snappy` | `layoutId` position and size | |
| Popover, dropdown, select | `snappy` | `opacity` 0 → 1, `scale` 0.97 → 1, `y` −4 → 0 | Origin = Radix transform-origin variable |
| Dialog / ⌘K | `reveal` | `opacity`, `scale` 0.96 → 1, `y` 8 → 0 | Exit: `exit` tween |
| Bottom sheet | `smooth` | `y` 100 % → 0 + drag to dismiss | Offset > 120 px or velocity > 600 px/s closes |
| Scroll entrance (below the fold) | `gentle` | `opacity` 0 → 1, `y` 12 → 0; 40 ms stagger, ≤ 8 items | Never on the LCP element |
| KPI number ticker | `gentle` | Value | `tabular-nums` while animating |
| Success confirmation | `bouncy` | `scale` 0.6 → 1 | Paired with a live-region message |
| Header condense | `snappy` | `height` 72 → 56 | Fires once when crossing 8 px of scroll |
| Device frame resize | `smooth` | Frame box size + iframe `scale` | §7.4 |

#### 6.4.1 Button press

See §5.4: `whileTap={{ scale: 0.97 }}` with `spring.press` on `m.button`; `asChild` buttons use the CSS `pressable` utility driven by the generated spring easing (§6.6).

#### 6.4.2 Segmented and tab indicators

```tsx
{items.map((item) => (
  <ToggleGroupItem key={item.value} value={item.value} className="relative h-8 rounded-sm px-3">
    {value === item.value && (
      <m.span
        layoutId="device-toggle-indicator"
        className="absolute inset-0 rounded-sm bg-card shadow-sm"
        transition={spring.snappy}
      />
    )}
    <span className="relative z-10 flex items-center gap-1.5">{item.icon}{item.label}</span>
  </ToggleGroupItem>
))}
```

#### 6.4.3 Modal reveal (Dialog)

```tsx
// src/components/ui/motion-dialog.tsx
'use client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { exit, spring } from '@/lib/motion/springs'

export function MotionDialog({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-70 bg-black/40 backdrop-blur-[2px] dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: exit }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              {/* Tailwind v4 translate utilities use the independent `translate` property,
                  so they compose with Motion's `transform` (scale, y) instead of fighting it. */}
              <m.div
                className="fixed left-1/2 top-1/2 z-70 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-popover p-6 text-popover-foreground shadow-modal"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 4, transition: exit }}
                transition={spring.reveal}
              >
                <DialogPrimitive.Title className="text-heading-4">{title}</DialogPrimitive.Title>
                {children}
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
```

#### 6.4.4 Bottom sheet (mobile license selector)

Use the same Radix Dialog shell as §6.4.3 (focus trap, Esc, `aria-modal`); only the content motion differs:

```tsx
<m.div
  className="fixed inset-x-0 bottom-0 z-70 rounded-t-[24px] bg-popover pb-[env(safe-area-inset-bottom)] shadow-modal"
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%', transition: exit }}
  transition={spring.smooth}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0.05, bottom: 0.6 }}
  onDragEnd={(_, info) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false)
  }}
>
  <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />
  {children}
</m.div>
```

#### 6.4.5 Popover / dropdown

```tsx
<m.div
  initial={{ opacity: 0, scale: 0.97, y: -4 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
  transition={spring.snappy}
  style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
/>
```

#### 6.4.6 Scroll entrances

```tsx
// src/components/motion/reveal.tsx
'use client'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'

export function Reveal({ index = 0, children }: { index?: number; children: React.ReactNode }) {
  return (
    <m.div
      data-reveal
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring.gentle, delay: Math.min(index, 7) * 0.04 }}
    >
      {children}
    </m.div>
  )
}
```

```css
/* No-JS safety net: never leave content invisible */
@media (scripting: none) { [data-reveal] { opacity: 1 !important; transform: none !important; } }
```

Never wrap the LCP element or anything above the fold. Server-rendered `opacity: 0` delays LCP and flashes during hydration.

#### 6.4.7 KPI number ticker

```tsx
'use client'
import { useEffect, useState } from 'react'
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'

export function NumberTicker({ value, format }: { value: number; format: (n: number) => string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => format(v))
  const reduce = useReducedMotion()
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (reduce) { mv.set(value); return }
    setRunning(true)
    const controls = animate(mv, value, { ...spring.gentle, onComplete: () => setRunning(false) })
    return () => controls.stop()
  }, [value, reduce, mv])

  // Tabular digits only while moving (no width jitter); proportional at rest (§3.4).
  return <m.span className={running ? 'tabular-nums' : undefined}>{text}</m.span>
}
```

#### 6.4.8 Success confirmation (copy)

```tsx
<AnimatePresence mode="wait" initial={false}>
  {copied ? (
    <m.span key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={spring.bouncy}>
      <Check className="size-4 text-success" aria-hidden />
    </m.span>
  ) : (
    <m.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <Copy className="size-4" aria-hidden />
    </m.span>
  )}
</AnimatePresence>
<span role="status" className="sr-only">{copied ? 'License key copied' : ''}</span>
```

#### 6.4.9 Accordion (CSS, spring easing)

```css
@keyframes accordion-down { from { height: 0 } to { height: var(--radix-accordion-content-height) } }
@keyframes accordion-up   { from { height: var(--radix-accordion-content-height) } to { height: 0 } }

[data-slot="accordion-content"] { overflow: hidden; }
[data-slot="accordion-content"][data-state="open"]   { animation: accordion-down var(--spring-smooth-duration) var(--spring-smooth); }
[data-slot="accordion-content"][data-state="closed"] { animation: accordion-up 160ms cubic-bezier(0.4, 0, 1, 1); }
```

#### 6.4.10 Header condense

```tsx
const { scrollY } = useScroll()
const [condensed, setCondensed] = useState(false)
useMotionValueEvent(scrollY, 'change', (y) => setCondensed(y > 8))

<m.header
  style={{ viewTransitionName: 'site-header' }}
  animate={{ height: condensed ? 56 : 72 }}
  transition={spring.snappy}
  className={cn('sticky top-0 z-40', condensed && 'border-b border-border/60 bg-background/72 backdrop-blur-xl backdrop-saturate-150')}
/>
```

### 6.5 Page Transitions — View Transitions API

#### 6.5.1 Architecture

- The Next.js 16 App Router ships React canary, so `import { ViewTransition } from 'react'` works without configuration. Navigations are Transitions, so `<ViewTransition>` animates them automatically.
- React's integration uses transition types and `view-transition-class` (Chromium 125+, recent Safari and Firefox). Without support, navigation is instant and nothing breaks.
- Named elements morph only when the destination renders in the same commit as the navigation, i.e. when it was prefetched. Product links keep default `<Link>` prefetching so PDP static shells are ready.
- Motion never animates route changes: layouts persist across navigations and pages unmount before JS exit animations could run.

#### 6.5.2 Naming registry

| Name / class | Element(s) | Behavior |
|---|---|---|
| `product-media-{slug}` · `share="morph"` | Card media ↔ PDP hero media ↔ Preview stage poster | Shared-element morph |
| `product-title-{slug}` · `share="morph"` | Card title ↔ PDP `h1` | Morph (text snapshot) |
| `site-header` (CSS `viewTransitionName`) | Global header | Anchored: no animation |
| `account-nav`, `docs-sidebar` | Persistent sidebars | Anchored |
| `nav-forward` / `nav-back` (types) | Page content wrapper | Directional slide |
| `collection-content` + `key` | Catalog grid across filter changes | Crossfade (same route) |

Keep names unique per page and at most about 10 named participants per view. Never name elements the user clicks rapidly (hit-testing skips named participants during a transition).

#### 6.5.3 Shared-element morph

```tsx
// Product card
<Link href={`/products/${slug}`} transitionTypes={['nav-forward']}>
  <ViewTransition name={`product-media-${slug}`} share="morph" default="none">
    <Image src={poster} alt="" width={800} height={500} sizes="(min-width: 1024px) 33vw, 100vw" />
  </ViewTransition>
</Link>

// PDP hero: same name, same props on both sides
<ViewTransition name={`product-media-${slug}`} share="morph" default="none">
  <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
    <Image src={hero} alt={`${name} preview`} fill sizes="(min-width: 1024px) 58vw, 100vw" />
  </div>
</ViewTransition>
```

With `default="none"`, always keep the explicit `share`; without it the pair silently stops morphing.

#### 6.5.4 Directional navigation

```tsx
// src/components/motion/page-transition.tsx: wrap the content of every page.tsx (never a layout)
import { ViewTransition } from 'react'

const directional = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' } as const

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  )
}
```

Tag links by hierarchy: deeper = `transitionTypes={['nav-forward']}` (catalog → PDP → preview); up the hierarchy = `['nav-back']` (breadcrumbs, "Back to …"). `router.push(href, { transitionTypes })` works the same. Browser back/forward carries no type, so only morphs play there.

#### 6.5.5 `src/styles/view-transitions.css`

```css
/* Keep the page clickable while snapshots animate */
::view-transition { pointer-events: none; }

/* Shared-element morph driven by the `smooth` spring (generated linear(), §6.6) */
::view-transition-group(.morph) {
  animation-duration: var(--spring-smooth-duration);
  animation-timing-function: var(--spring-smooth);
}
::view-transition-image-pair(.morph) { animation-name: vt-via-blur; }
@keyframes vt-via-blur { 30% { filter: blur(3px); } }

/* Directional slides: quick exit, spring entrance */
::view-transition-old(.nav-forward) {
  --slide-offset: -48px;
  animation: 150ms cubic-bezier(0.4, 0, 1, 1) both vt-fade reverse,
             var(--spring-smooth-duration) var(--spring-smooth) both vt-slide reverse;
}
::view-transition-new(.nav-forward) {
  --slide-offset: 48px;
  animation: 210ms ease-out 90ms both vt-fade,
             var(--spring-smooth-duration) var(--spring-smooth) both vt-slide;
}
::view-transition-old(.nav-back) {
  --slide-offset: 48px;
  animation: 150ms cubic-bezier(0.4, 0, 1, 1) both vt-fade reverse,
             var(--spring-smooth-duration) var(--spring-smooth) both vt-slide reverse;
}
::view-transition-new(.nav-back) {
  --slide-offset: -48px;
  animation: 210ms ease-out 90ms both vt-fade,
             var(--spring-smooth-duration) var(--spring-smooth) both vt-slide;
}
@keyframes vt-fade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes vt-slide { from { translate: var(--slide-offset) 0; } to { translate: 0 0; } }

/* Anchored header */
::view-transition-group(site-header) { animation: none; z-index: 100; }
::view-transition-old(site-header) { display: none; }
::view-transition-new(site-header) { animation: none; }

/* Theme switch (§6.5.6): no crossfade on the root while revealing */
html[data-theme-transition]::view-transition-old(root),
html[data-theme-transition]::view-transition-new(root) { animation: none; mix-blend-mode: normal; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation-duration: 0s !important; animation-delay: 0s !important; }
}
```

#### 6.5.6 Theme toggle: circular reveal

```tsx
'use client'
import { flushSync } from 'react-dom'
import { useTheme } from 'next-themes'

export function useThemeReveal() {
  const { resolvedTheme, setTheme } = useTheme()

  return (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next)
      return
    }
    const { clientX: x, clientY: y } = event
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    root.dataset.themeTransition = ''
    const transition = document.startViewTransition(() => {
      root.classList.toggle('dark', next === 'dark') // synchronous DOM change for the snapshot
      flushSync(() => setTheme(next))
    })
    transition.ready.then(() => {
      const css = getComputedStyle(root)
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: parseFloat(css.getPropertyValue('--spring-gentle-duration')),
          easing: css.getPropertyValue('--spring-gentle').trim(),
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    transition.finished.finally(() => delete root.dataset.themeTransition)
  }
}
```

#### 6.5.7 Loading handoffs

Suspense fallbacks exit fast (150 ms fade + 10 px down) and content enters slower (210 ms fade after the exit + spring slide up) by wrapping the fallback in `<ViewTransition exit="slide-down" default="none">` and the content in `<ViewTransition enter="slide-up" default="none">`. Skeletons must match final geometry exactly (CLS ≤ 0.05).

#### 6.5.8 Don'ts

- No View Transitions inside the Live Preview (device switching is Motion, §7.4) or on admin data tables.
- Never name elements inside iframes, portals or virtualized lists.
- No more than one morph pair per navigation; if the product appears twice on a page, name only one instance.

### 6.6 Spring → CSS `linear()` Generator

CSS surfaces (View Transitions, `pressable`, accordion) need the same physics as Motion. This script samples the closed-form spring and emits CSS `linear()` easings plus matching durations. It is simplified with Ramer–Douglas–Peucker at 0.004 tolerance and trimmed when the spring stays within 0.5 % of its target.

```js
// scripts/generate-spring-easings.mjs
// Emits the :root spring tokens and the matching Tailwind `ease-spring-*` utilities.
// Usage: node scripts/generate-spring-easings.mjs > src/styles/springs.css
const SPRINGS = {
  snappy: { stiffness: 500, damping: 32, mass: 0.8 },
  smooth: { stiffness: 300, damping: 30, mass: 1 },
  gentle: { stiffness: 170, damping: 26, mass: 1 },
}

/** Closed-form position (0 → 1) of a damped spring released from rest. */
function springAt(t, { stiffness: k, damping: c, mass: m }) {
  const w0 = Math.sqrt(k / m)
  const zeta = c / (2 * Math.sqrt(k * m))
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const s = w0 * Math.sqrt(zeta * zeta - 1)
  const r1 = -zeta * w0 + s
  const r2 = -zeta * w0 - s
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
}

function toCssLinear(spec, { rest = 0.005, samples = 80, tolerance = 0.004 } = {}) {
  let T = 0
  for (let t = 0; t < 3; t += 0.0005) if (Math.abs(1 - springAt(t, spec)) > rest) T = t
  const pts = Array.from({ length: samples + 1 }, (_, i) => [i / samples, i === samples ? 1 : springAt((T * i) / samples, spec)])
  const rdp = (p) => {
    if (p.length < 3) return p
    const [a, b] = [p[0], p.at(-1)]
    let dmax = 0
    let idx = 0
    for (let i = 1; i < p.length - 1; i++) {
      const d = Math.abs((b[1] - a[1]) * p[i][0] - (b[0] - a[0]) * p[i][1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(b[1] - a[1], b[0] - a[0])
      if (d > dmax) { dmax = d; idx = i }
    }
    return dmax > tolerance ? [...rdp(p.slice(0, idx + 1)).slice(0, -1), ...rdp(p.slice(idx))] : [a, b]
  }
  const stops = rdp(pts).map(([x, y], i, arr) =>
    i === 0 ? '0' : i === arr.length - 1 ? '1' : `${+y.toFixed(3)} ${+(x * 100).toFixed(1)}%`)
  return { duration: Math.round(T * 1000), easing: `linear(${stops.join(', ')})` }
}

const lines = [':root {']
for (const [name, spec] of Object.entries(SPRINGS)) {
  const { duration, easing } = toCssLinear(spec)
  lines.push(`  --spring-${name}-duration: ${duration}ms;`, `  --spring-${name}: ${easing};`)
}
lines.push('}', '@theme inline {')
for (const name of Object.keys(SPRINGS)) lines.push(`  --ease-spring-${name}: var(--spring-${name});`)
lines.push('}')
console.log(lines.join('\n'))
```

Run it as `pnpm gen:springs`. On Windows, a PowerShell 5.1 `>` redirect writes UTF-16 and breaks the CSS import; pnpm runs scripts through cmd.exe, which keeps UTF-8.

**Generated output** (`src/styles/springs.css`, committed; CI re-runs the script and fails on drift):

```css
:root {
  --spring-snappy-duration: 289ms;
  --spring-snappy: linear(0, 0.004 1.3%, 0.032 3.8%, 0.109 7.5%, 0.511 21.3%, 0.699 28.7%, 0.816 35%, 0.912 42.5%, 0.945 46.3%, 0.976 51.2%, 1.007 61.3%, 1.015 75%, 1.005 98.8%, 1);
  --spring-smooth-duration: 282ms;
  --spring-smooth: linear(0, 0.007 2.5%, 0.026 5%, 0.09 10%, 0.574 36.3%, 0.686 43.8%, 0.789 52.5%, 0.874 62.5%, 0.93 72.5%, 0.969 83.8%, 1);
  --spring-gentle-duration: 565ms;
  --spring-gentle: linear(0, 0.015 2.5%, 0.079 6.3%, 0.434 20%, 0.603 27.5%, 0.73 35%, 0.821 42.5%, 0.866 47.5%, 0.9 52.5%, 0.949 63.7%, 0.978 77.5%, 0.995 98.8%, 1);
}
@theme inline {
  --ease-spring-snappy: var(--spring-snappy);
  --ease-spring-smooth: var(--spring-smooth);
  --ease-spring-gentle: var(--spring-gentle);
}
```

`--spring-snappy` intentionally exceeds 1 (the 1.5 % overshoot); `linear()` supports output values outside 0–1.

### 6.7 Motion Performance Rules

1. Animate `transform`, `opacity` and `clip-path`. Size animations only where documented (§6.1 #4).
2. `LazyMotion` with async features + `m.*` components everywhere (§6.3).
3. No entrance animation on the LCP element or above-the-fold text.
4. `whileInView` always uses `once: true`; stagger ≤ 8 items at 40 ms.
5. At most ~12 concurrently running springs per viewport.
6. No `filter: blur()` animation on elements larger than 400 × 400 px.
7. Let Motion manage `will-change`; never set it globally.
8. Profile at 4× CPU throttling: the device switch (§7.4) and bottom sheet must not drop frames longer than 16 ms after the initial demo reflow.

### 6.8 Reduced-Motion Matrix

| Element | Default | `prefers-reduced-motion: reduce` |
|---|---|---|
| Button press, tile hover lift | Springs | No transform; color change only |
| Dialogs, popovers, sheets | Spring reveal | Opacity fade 120 ms |
| Scroll entrances | Fade + rise | Rendered visible immediately |
| Route changes (View Transitions) | Morph / slide | Instant |
| Theme switch | Circular reveal | Instant |
| Device frame resize | Spring resize | Instant resize |
| Number tickers | Count up | Final value |
| Spotlight, border beam, hover videos | On | Off (video shows its poster) |
| Skeleton shimmer | 1.6 s loop | Static |

---

## 7. Live Preview Player

### 7.1 Anatomy

**Desktop (≥ 1024 px)**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ← SaaS Starter  v2.3.1 │ [▭ Desktop][▯ Tablet][▯ Mobile][⤢ Fit] ⟳ ↻  Page: /pricing ▾│ $249 [Team ▾] [Buy license] │  ← Toolbar 56 px, glass
├──────────────────────────────────────────────────────────────────────────────────────┤
│                              Stage · --stage + 24 px dot grid                        │
│                    ┌───────────────── device frame ─────────────────┐               │
│                    │  saas-starter.lumira-demos.dev/pricing (36 px)  │               │
│                    │                                                 │               │
│                    │          iframe at true viewport, scaled        │               │
│                    │                                                 │               │
│                    └─────────────────────────────────────────────────┘               │
│                          Desktop · 1440 × 900 · 78%   (mono 12, muted)               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Mobile (< 768 px)**

```
┌───────────────────────────────┐
│ ←  SaaS Starter   [Mobile ▾] ⋯│  ← Top bar 52 px
├───────────────────────────────┤
│         Stage (16 px pad)     │
│   ┌───────────────────────┐   │
│   │  iframe 393 × 852     │   │
│   │  scale 1 (native)     │   │
│   └───────────────────────┘   │
├───────────────────────────────┤
│ [Team ▾]  $249   [Buy license]│  ← Buy bar 64 px + safe-area inset
└───────────────────────────────┘
```

### 7.2 Layout Specification

| Element | Specification |
|---|---|
| Container | Full viewport (`100dvh`). Modal mode: intercepted route rendered in a full-screen dialog (z 70). Page mode: `/products/[slug]/preview`. |
| Toolbar | 56 px, `bg-background/72 backdrop-blur-xl`, bottom hairline, 12 px horizontal padding. Three zones: identity (left, shrinks and truncates), device controls (center), purchase (right, never shrinks). |
| Stage | `bg-stage` with a dot grid (`radial-gradient(var(--stage-dot) 1px, transparent 1px) 0 0 / 24px 24px`); padding 32 px desktop, 16 px mobile; centers the frame. |
| Device frame | `bg-card`, `shadow-modal`, radii per §7.3; desktop frames add a 36 px browser bar with a mono 12 px URL pill (the current demo path). |
| Status line | Under the frame: `Mobile · 393 × 852 · 86%` in `font-mono text-xs text-muted-foreground tabular-nums`. |
| Mobile | 52 px top bar (back, name, device menu, overflow menu with reload/open/theme) + 64 px glass buy bar with `pb-[env(safe-area-inset-bottom)]`. |

### 7.3 Device Presets & Scale-to-Fit

| Key | Label | CSS viewport | Rotated | Chrome | Radius (outer / inner) |
|---|---|---|---|---|---|
| `desktop` | Desktop | 1440 × 900 | — | 36 px browser bar | 12 / 12 (top corners) |
| `tablet` | Tablet | 834 × 1194 | 1194 × 834 | 14 px bezel | 36 / 22 |
| `mobile` | Mobile | 393 × 852 | 852 × 393 | 10 px bezel | 44 / 34 |
| `fit` | Fit | Stage size (responsive) | — | None | 12 |

Inner radii follow the concentric rule (outer − bezel). Frames are generic rounded rectangles, never replicas of real hardware.

```ts
// src/components/preview/devices.ts
export type DeviceKey = 'desktop' | 'tablet' | 'mobile' | 'fit'

export const DEVICES = {
  desktop: { label: 'Desktop', w: 1440, h: 900,  bezel: 0,  bar: 36, radius: 12 },
  tablet:  { label: 'Tablet',  w: 834,  h: 1194, bezel: 14, bar: 0,  radius: 36 },
  mobile:  { label: 'Mobile',  w: 393,  h: 852,  bezel: 10, bar: 0,  radius: 44 },
} as const

export type Frame = { vw: number; vh: number; scale: number; chromeX: number; chromeY: number }

/** Fractional scales blur text: snap to 1 when within 1.5 %. */
const snap = (s: number) => (s >= 0.985 ? 1 : Math.round(s * 1000) / 1000)

export function computeFrame(stage: { w: number; h: number }, key: DeviceKey, rotated: boolean, pad = 32): Frame {
  if (key === 'fit') return { vw: stage.w - pad * 2, vh: stage.h - pad * 2, scale: 1, chromeX: 0, chromeY: 0 }
  const d = DEVICES[key]
  const chromeX = d.bezel * 2
  const chromeY = d.bezel * 2 + d.bar
  const vw = rotated ? d.h : d.w
  const vh = rotated ? d.w : d.h
  const availW = stage.w - pad * 2 - chromeX
  const availH = stage.h - pad * 2 - chromeY

  if (key === 'desktop') {
    // Fit width; the frame fills the stage height and the demo scrolls inside it.
    const scale = snap(Math.min(1, availW / vw))
    return { vw, vh: Math.floor(availH / scale), scale, chromeX, chromeY }
  }
  return { vw, vh, scale: snap(Math.min(1, availW / vw, availH / vh)), chromeX, chromeY }
}
```

The stage size comes from a `ResizeObserver` on the stage element (debounced to one update per animation frame).

### 7.4 Device Switch Choreography

Changing an iframe's width on every animation frame forces the whole demo to re-layout 60 times per second and flips its media queries mid-flight. The player therefore:

1. **t = 0:** sets the iframe's CSS viewport to the target size **once**. The demo reflows a single time, straight into its final breakpoint.
2. **t = 0–90 ms:** dips iframe opacity to 0.6 to mask that reflow.
3. **t = 0 → settle (~250 ms):** animates the frame box (`width`, `height`) and the iframe's `scale` with the **same** `smooth` spring, so bezel and content stay locked together. Only the small frame box re-lays out each frame; the absolutely positioned iframe does not.
4. **On settle:** fades opacity back to 1 (120 ms) and announces the new device in the live region.

```tsx
// src/components/preview/use-device-frame.ts
'use client'
import { useEffect } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { spring } from '@/lib/motion/springs'
import type { Frame } from './devices'

export function useDeviceFrame(frame: Frame) {
  const width = useMotionValue(frame.vw * frame.scale + frame.chromeX)
  const height = useMotionValue(frame.vh * frame.scale + frame.chromeY)
  const scale = useMotionValue(frame.scale)
  const opacity = useMotionValue(1)

  useEffect(() => {
    const w = frame.vw * frame.scale + frame.chromeX
    const h = frame.vh * frame.scale + frame.chromeY
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      width.set(w); height.set(h); scale.set(frame.scale)
      return
    }
    const dip = animate(opacity, 0.6, { duration: 0.09, ease: 'easeOut' })
    const controls = [animate(width, w, spring.smooth), animate(height, h, spring.smooth), animate(scale, frame.scale, spring.smooth)]
    Promise.all(controls).then(() => animate(opacity, 1, { duration: 0.12 }))
    return () => { dip.stop(); controls.forEach((c) => c.stop()) }
  }, [frame.vw, frame.vh, frame.scale, frame.chromeX, frame.chromeY, width, height, scale, opacity])

  return { width, height, scale, opacity }
}
```

```tsx
// src/components/preview/device-frame.tsx (excerpt)
const { width, height, scale, opacity } = useDeviceFrame(frame)

<m.div className="relative overflow-hidden bg-card shadow-modal" style={{ width, height, borderRadius: radius }}>
  {device === 'desktop' && <BrowserBar path={path} />}
  <m.iframe
    ref={iframeRef}
    src={src}
    title={`Live preview of ${product.name}`}
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    allow=""
    referrerPolicy="strict-origin-when-cross-origin"
    className="absolute origin-top-left border-0 bg-white"
    // width/height are plain numbers (applied once); only scale and opacity animate.
    style={{ left: bezel, top: bezel + bar, width: frame.vw, height: frame.vh, scale, opacity }}
  />
</m.div>
```

Rotation reuses the same choreography with swapped dimensions; only the rotate icon itself spins 90° (`snappy`).

### 7.5 Toolbar Controls & Keyboard Shortcuts

| Control | Component | Shortcut | Behavior |
|---|---|---|---|
| Back / close | Ghost icon button + product name | `Esc` | Modal: close (focus returns to the PDP trigger). Page: back to the PDP with `nav-back`. |
| Device | Segmented `ToggleGroup` (`Monitor`, `Tablet`, `Smartphone`, `Maximize2` icons + labels ≥ `xl`) | `1` `2` `3` `0` | Single selection with roving focus and arrow keys; mirrors `?device=` |
| Rotate | Icon button `RotateCw` | `R` | Tablet and mobile only; mirrors `?rotated=1` |
| Page | `Select` from Sanity `demo.pages[]` | `P` focuses it | Sets iframe `src`; the bridge keeps it in sync (`?path=`) |
| Reload | Icon button `RefreshCw` | `Shift` + `R` | Reloads the iframe only |
| Theme hint | `Sun` / `Moon` toggle (only if `demo.supportsTheme`) | `T` | Sends `set-theme` through the bridge |
| Open in new tab | Icon button `ExternalLink` | `O` | `target="_blank" rel="noopener"` |
| Buy | Price + tier `Select` + `Button` | `B` | Opens the license selector (§7.6) |
| Shortcuts | `?` button | `?` | Popover listing shortcuts with `Kbd` |

Shortcuts are ignored while focus is in an input, select, textarea or contenteditable element, and when Ctrl/⌘/Alt is held (browser shortcuts win). Keystrokes inside the cross-origin iframe never reach the player.

### 7.6 Persistent Buy CTA

| State | Desktop (toolbar right zone) | Mobile (bottom bar) |
|---|---|---|
| **Default** | `$249` (`text-[15px] font-semibold`) · compact tier `Select` (`Team ▾`, 40 px) · `Button` default (ink) "Buy license" | Native-styled tier select + price (left) · `Button lg` "Buy license" (right, 48 px) |
| **Promo applied** | Struck-through original (`text-muted-foreground line-through`) + discounted price + `LAUNCH30` pill (`brand` badge) | Same, condensed |
| **Starting checkout** | Button keeps its width; spinner + sr-only "Starting checkout"; other controls stay usable | Same |
| **Owned** | "Owned · Team" badge + `secondary` "Open in Library" (+ "Upgrade" link if a higher tier exists) | Same |
| **Unavailable** | Disabled button + tooltip ("Checkout is temporarily unavailable") | Same + inline text |

- The tier dropdown lists Personal, Team and Extended with price and activation limit, then an All-Access row ("Every asset · from $X/mo").
- The CTA is **never** covered by player UI (only the license selector opens over it), stays visible at every width ≥ 320 px, and the stage height subtracts the toolbar and buy bar heights.
- Clicking opens the license selector *over the running demo* (popover on desktop, bottom sheet on mobile); the iframe stays mounted. `Checkout.Success` routes to `/checkout/success`.

### 7.7 States

| State | Trigger | Visual | Copy |
|---|---|---|---|
| `loading` | `src` set | Frame skeleton with shimmer; product logo mark centered | "Loading live demo…" (mono 12, muted) |
| `slow` | > 3 s without ready | Same + subtitle | "Warming up the demo. First loads can take a few seconds." |
| `ready` | iframe `load` or bridge `ready` | Skeleton crossfades out (180 ms); iframe fades in | — |
| `failed` | > 8 s, bridge `error`, or network error | Screenshot carousel for the current device (Sanity `demo.gallery`) + inline alert with "Retry" and "Open in new tab" | "The live demo didn't load. You can browse screenshots or open it in a new tab." |
| `hidden` | Route hidden by `<Activity>` (PRD FR-LP-09) | iframe `src` → `about:blank`; restored on show | — |

### 7.8 postMessage Bridge Protocol

```ts
// packages/preview-bridge/src/protocol.ts
import { z } from 'zod'

export const DemoMessage = z.discriminatedUnion('type', [
  z.object({ source: z.literal('lumira-demo'), v: z.literal(1), type: z.literal('ready'), path: z.string(), title: z.string(),
             themes: z.array(z.enum(['light', 'dark'])).optional() }),
  z.object({ source: z.literal('lumira-demo'), v: z.literal(1), type: z.literal('navigate'), path: z.string(), title: z.string() }),
  z.object({ source: z.literal('lumira-demo'), v: z.literal(1), type: z.literal('error'), message: z.string().max(500) }),
])

export const HostMessage = z.discriminatedUnion('type', [
  z.object({ source: z.literal('lumira-host'), v: z.literal(1), type: z.literal('set-theme'), theme: z.enum(['light', 'dark']) }),
  z.object({ source: z.literal('lumira-host'), v: z.literal(1), type: z.literal('navigate'), path: z.string().startsWith('/') }),
])
```

```ts
// Host side (player)
useEffect(() => {
  function onMessage(event: MessageEvent) {
    if (event.origin !== demoOrigin) return                              // exact origin match
    if (event.source !== iframeRef.current?.contentWindow) return       // from *our* iframe only
    const parsed = DemoMessage.safeParse(event.data)
    if (parsed.success) dispatch(parsed.data)
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}, [demoOrigin])

const send = (message: z.infer<typeof HostMessage>) =>
  iframeRef.current?.contentWindow?.postMessage(message, demoOrigin)    // never '*'
```

```ts
// Demo side (@lumira/preview-bridge, loaded only when framed)
const HOSTS = ['https://lumira.dev'] // + preview hosts from build-time env
if (window.parent !== window) {
  const host = HOSTS.find((h) => document.referrer.startsWith(h)) ?? HOSTS[0]
  const post = (m: object) => window.parent.postMessage({ source: 'lumira-demo', v: 1, ...m }, host)
  post({ type: 'ready', path: location.pathname, title: document.title })
  // Report client-side navigations (history API + popstate) as { type: 'navigate', path, title }.
  window.addEventListener('message', (e) => { if (!HOSTS.includes(e.origin)) return /* apply set-theme / navigate */ })
}
```

### 7.9 Security Attributes

| Layer | Setting |
|---|---|
| iframe | `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"` (no `allow-top-navigation`), `allow=""`, `referrerpolicy="strict-origin-when-cross-origin"` |
| Origin | Demos live on the separate registrable domain `*.lumira-demos.dev`. `allow-same-origin` only lets a demo use its *own* storage; it can never reach `lumira.dev` cookies. |
| Demo headers | `Content-Security-Policy: frame-ancestors https://lumira.dev` (+ preview hosts), `X-Robots-Tag: noindex` |
| Storefront CSP | `frame-src https://*.lumira-demos.dev` |
| Messaging | Exact origin + `event.source` checks; Zod-validated payloads; explicit `targetOrigin` |

### 7.10 Accessibility

- The iframe `title` names the product. On open, focus moves to the toolbar heading; `Esc` closes; focus returns to the trigger.
- A visually hidden "Skip to buy" link is the first focusable element.
- Device changes are announced politely: "Mobile, 393 by 852, 86 percent".
- The device control exposes single-selection semantics with arrow-key navigation; the active state is not conveyed by color alone (indicator + `aria-checked`).
- `:focus-within` on the frame draws the focus ring when keyboard focus is inside the demo.
- Every control meets the 24 × 24 px minimum; the mobile Buy button is 48 px tall.

### 7.11 Component API & Files

```tsx
<PreviewPlayer
  mode="modal" // or "page"
  product={{
    slug: 'saas-starter',
    name: 'SaaS Starter',
    version: '2.3.1',
    demo: { origin: 'https://saas-starter.lumira-demos.dev', pages: [{ label: 'Home', path: '/' }, { label: 'Pricing', path: '/pricing' }], supportsTheme: true, gallery },
  }}
  pricing={{ variants, defaultTier: 'team', promo }}
  ownership={ownership} // from the server (Suspense hole); null when signed out
  initial={{ device: 'desktop', rotated: false, path: '/' }}
/>
```

```
src/components/preview/
  preview-player.tsx        state machine (loading | slow | ready | failed | hidden), layout, URL sync
  preview-toolbar.tsx       identity · device controls · purchase zones
  device-toggle.tsx         segmented control + layoutId indicator
  device-frame.tsx          frame box, browser bar, iframe
  devices.ts                presets + computeFrame()
  use-device-frame.ts       §7.4 choreography
  use-stage-size.ts         ResizeObserver (rAF-throttled)
  use-demo-bridge.ts        §7.8 host side
  use-preview-shortcuts.ts  §7.5
  buy-cta.tsx               §7.6 (desktop + mobile bar)
  preview-fallback.tsx      failed state gallery
```

---

## 8. Imagery & Media

| Asset | Specification |
|---|---|
| PDP hero | 16:10; 2400 × 1500 master; AVIF (≈ q60) + WebP via the Sanity image pipeline; device-framed screenshot on the `--stage` color; light and dark variants when the product supports both |
| Card poster | 1600 × 1000; same framing as the hero so the View Transition morph reads as one object |
| Hover video | 1280 × 800, 8 s seamless loop (first frame = last frame), 30 fps, no audio track, WebM (AV1/VP9) + MP4 (H.264), ≤ 1.5 MB |
| Preview fallback gallery | One set per device preset at 2× (desktop 2880 × 1800, tablet 1668 × 2388, mobile 786 × 1704) |
| OG image | 1200 × 630, generated with `next/og`: canvas + top-left hero glow; left column eyebrow, product name (display), tagline, price and version pill; right column product shot |
| Stack icons | Official monochrome marks, `currentColor` SVG |

**Art direction:** real product UI only. No stock photography, no abstract 3D blobs, no fabricated metrics or testimonials, no replicas of real device hardware (generic frames only).

---

## 9. Voice & Microcopy

**Tone:** precise, calm, confident. Short sentences. Numbers as digits. Sentence case. No exclamation marks except in success states. Errors say what happened, what to do and give a reference code.

| Context | Copy |
|---|---|
| Primary purchase CTA | "Buy license" |
| Preview CTA | "Live Preview" |
| Owned product | "Open in Library" |
| Download button | "Download v2.3.1 · 48.2 MB" |
| Activation meter | "2 of 5 activations used" |
| Tax note | "Tax/VAT calculated at checkout." |
| Success page | "You're all set. Your license key and download are below, and we've emailed them to you too." |
| Download error | "We couldn't prepare your download. Try again. If it keeps failing, contact support and mention code DL-7F3A." |
| Activation limit | "This key has reached its activation limit (1 of 1). Free an activation in your Library or upgrade to Team." |
| Discord gate (not eligible) | "The Lumira Discord is for verified license holders. Buy any product to join." |
| MoR footer | "Payments, tax and invoicing are handled by Lemon Squeezy, our Merchant of Record." |
| Empty library | "Nothing here yet. Your purchases will appear in this Library, with every future version." |

---

## 10. Design QA Checklist (every UI pull request)

- [ ] Only tokens: no raw hex or OKLCH in components (lint rule: no color literals outside `globals.css`).
- [ ] Contrast pairs in §2.5 still pass (CI check); new pairs are added to the matrix.
- [ ] Radii follow the concentric rule; Bento bands pass `validateBands`.
- [ ] Focus visible (2 px ring + offset) on every interactive element, in both themes.
- [ ] Hit targets ≥ 24 px; purchase CTAs ≥ 44 px.
- [ ] Springs use tokens from §6.2; exits use `exit`; nothing animates the LCP element.
- [ ] Reduced-motion behavior matches §6.8.
- [ ] ≤ 2 active backdrop blurs per viewport.
- [ ] Mono only for precision content (§3.5); tabular numbers where values align.
- [ ] Light and dark Playwright snapshots updated.
- [ ] Copy follows §9 (sentence case, specific errors).


