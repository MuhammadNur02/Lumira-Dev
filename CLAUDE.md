@AGENTS.md

# Project: Lumira E-Commerce (High-End Web Assets)

## Role & Vibe
- Act as a Senior Principal Full-Stack Engineer and Lead UX Architect.
- **Aesthetic:** "Bento Grid 2.0" (Premium, Dark Mode, mathematically balanced, heavy emphasis on whitespace).
- **Vibe:** Highly professional, frictionless, trustworthy, targeted at senior developers and agency owners.

## Tech Stack Mandates
- **Framework:** Next.js (App Router, prioritize Server Components).
- **Language:** TypeScript (Strict typing).
- **Styling:** Tailwind CSS + Shadcn UI.
- **Animations:** Framer Motion & View Transitions API. 
- **Database & ORM:** PostgreSQL + Drizzle ORM.
- **Authentication:** Clerk.
- **Payments & Licensing:** Lemon Squeezy.
- **Asset Storage:** Cloudflare R2.
- **CMS:** Sanity.io.

## Design System Rules
- **Typography:** Use `Geist Sans` for headings/UI and `Geist Mono` for code blocks/license keys. Use tight line-heights (`leading-tight`) for headings.
- **Colors:** Deep dark mode baseline (`--background: 0 0% 3%`).
- **Motion:** Strictly use Spring Physics for interactions (e.g., `type: "spring", stiffness: 400, damping: 30`). Avoid linear easing.
- **Borders & Depth:** Avoid thick solid borders. Use semi-transparent borders (e.g., `border-white/5`) combined with subtle inner glows (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]`).
- **Radii:** `rounded-2xl` or `rounded-3xl` for outer cards/containers, `rounded-lg` for nested elements.
- **Glassmorphism:** Use `bg-background/50 backdrop-blur-xl` for sticky headers, navs, and overlays.

## Coding Standards
- Write clean, modular, production-ready code.
- Never skip security implementations (e.g., strictly verify Lemon Squeezy webhook signatures).
- Keep client-side JavaScript minimal; maximize Server Components.