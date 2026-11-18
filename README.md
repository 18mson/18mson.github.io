# Muhamad Son'ani — Portfolio

A high-performance, single-page portfolio engineered with Next.js, TypeScript, Tailwind CSS, GSAP, and a custom HTML5 Canvas 2D simulation engine.

## Tech Stack

- **Framework:** Next.js (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animation & Scroll:** GSAP & ScrollTrigger
- **Smooth Scrolling:** Lenis
- **Graphics & Physics:** Custom HTML5 Canvas 2D (Boids flocking algorithm, kinematic spine fish models, 2D damping water ripples)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Create optimized production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Directory Structure (`src/`)

```
src/
├── app/                      # Next.js App Router entry point, layout, and page composition
├── features/                 # Self-contained domain modules encapsulating UI and business logic
│   ├── contact/              # Craft & Technical Arsenal bento grid, contact card, and footer outro
│   ├── hero/                 # Hero section with sticky typography, color transitions, and scroll overlay
│   ├── koi-pond/             # Interactive koi pond (React canvas wrapper & simulation engine)
│   │   └── engine/           # Pure TypeScript Canvas 2D simulation (fish kinematics, water physics, lotus pads)
│   ├── projects/             # Selected works showcase with GSAP horizontal pinned reel and mobile carousel
│   └── timeline/             # Reverse-chronological career journey with ScrollTrigger progress tracking
├── components/               # Reusable UI primitives and global layout components
│   ├── layout/               # Global wrappers (e.g., Lenis smooth scroll provider)
│   └── ui/                   # Shared UI primitives
├── content/                  # Static domain data (career timeline, project showcases, bio)
├── hooks/                    # Shared application-level React hooks
├── lib/                      # Third-party integrations and plugin registrations (e.g., GSAP)
└── types/                    # Shared TypeScript interfaces and type definitions
```

## Architectural Guidelines

1. **Unidirectional Dependency Flow:** `app` → `features` → (`components`, `lib`, `content`).
2. **Feature Isolation:** Features must never import from other features. Cross-feature orchestration is handled strictly at the `app` level.
3. **Engine Purity:** `src/features/koi-pond/engine/` consists of pure TypeScript and mathematical algorithms with zero external UI or framework dependencies.
4. **Client Component Boundaries:** `"use client"` directives are restricted to interactive leaves (`Hero`, `KoiCanvas`, `Timeline`, `Projects`, `SmoothScroll`). Layouts, server pages, and utility modules remain purely server-side or environment-agnostic.
