---
name: Emerald Transit
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#2b6954'
  on-secondary: '#ffffff'
  secondary-container: '#adedd3'
  on-secondary-container: '#306d58'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#b0f0d6'
  secondary-fixed-dim: '#95d3ba'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#0b513d'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an intuitive, fast-paced, and modern urban mobility experience. Engineered for commuters, transit authorities, and multi-modal route planners, it merges the clean clarity of Scandinavian civic infrastructure with the dynamic energy of contemporary micro-mobility platforms.

The aesthetic philosophy balances **Modern Utility** with **Tactile Airiness**:
- **Effortless Wayfinding:** Critical real-time telemetry (departures, delays, transit lines) is visually distinct and prioritized, minimizing cognitive load during fast transitions.
- **Eco-Forward Vitality:** Grounded by energetic emerald tones that communicate environmental progress, clean propulsion, and reliability.
- **Micro-Structured Layouts:** Crisp surface divisions, delicate borders, and balanced whitespace produce a clean, utilitarian canvas that avoids visual noise.

## Colors

The color palette centers on vibrant emeralds balanced by deep forest tones and pale mint neutrals:

- **Primary (`#059669` / `#10B981`):** Represents motion, active states, valid connections, and on-time schedules. `#059669` handles primary interactive actions and foreground icons requiring AA compliance, while `#10B981` serves as an active indicator and accent highlight.
- **Secondary (`#064E3B`):** A dense, anchoring forest slate for structural frames, high-emphasis text banners, and transit route markers.
- **Tertiary (`#10B981`):** Used for micro-badges, live status pings, and positive feedback cues.
- **Neutral & Typography (`#0F172A`):** Deep slate-black ensures high legibility against white and mint tinted backdrops. Subdued text utilizes `#475569` and subtle borders use `#E2E8F0`.
- **Canvas & Containers:** Base application canvas is set to `#FFFFFF` with primary backdrop fills transitioning to `#F0FDF4` (subtle mint). Surface containers use solid white `#FFFFFF` layered over `#F8FAFC` or `#ECFDF5` for inset modules.

## Typography

The typography uses Plus Jakarta Sans across all levels. Its balanced geometric construction and tall x-height allow for instant scanning of routes, arrival times, and line numbers even in high-glare transit environments.

- **Numerics & Wayfinding:** Arrival estimates, platform numbers, and tracking distances rely on bold and semi-bold weights with tight letter tracking to emphasize hierarchy.
- **Labels & Badges:** `label-sm` applies uppercase styling with expanded letter-spacing (`0.05em`) for line identities, live bus tags, and operational states.
- **Body Rhythm:** `body-md` remains the default for schedule summaries and route step descriptions, maintaining comfortable readability with a 1.42 line-height ratio.

## Layout & Spacing

The layout model is based on an 8-point spatial system implemented across a responsive, fluid grid:

- **Desktop (1024px+):** 12-column grid system featuring `2rem` outer page margins and `1rem` column gutters. Route search tools and transit line sheets settle inside fixed sidebars (360px–420px) while interactive maps occupy the remaining fluid canvas.
- **Tablet (768px - 1023px):** 8-column layout with `1.5rem` margins and collapsible drawers for step-by-step navigation.
- **Mobile (< 768px):** 4-column layout with `1rem` outer canvas padding. Sheet interfaces dock at the screen base with quick swipe thresholds to display vehicle positions and upcoming stops.
- **Component Flow:** Cards and lists rely on `space-sm` (8px) for tightly related items (e.g., stop dot indicators) and `space-md` (16px) for distinct timetable rows.

## Elevation & Depth

Visual depth is achieved through clean, tonal stacking and soft, diffused atmospheric shadows, avoiding harsh skeuomorphic bevels:

- **Base Layer (L0):** The primary view layer (`#F0FDF4` or pure `#FFFFFF`) with zero shadow.
- **Card & Inset Containers (L1):** Elevated with a subtle 1px border (`#E2E8F0` or `#D1FAE5`) and an ambient shadow: `0 2px 6px -1px rgba(6, 78, 59, 0.04), 0 1px 3px -1px rgba(15, 23, 42, 0.03)`.
- **Floating Overlays & Floating Action Controls (L2):** Map controls, departure pill badges, and active sheet menus use elevated layers with an extended green-tinted shadow: `0 10px 25px -3px rgba(6, 78, 59, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)`.
- **Modals & Drawers (L3):** Highest visual level, backed by a soft modal backdrop (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`) and a deep atmospheric drop: `0 20px 35px -5px rgba(6, 78, 59, 0.12)`.

## Shapes

The shape system defaults to an approachable, ergonomic radius:

- **Base Radius (`rounded-md` / 0.5rem):** Applied to form fields, nested alerts, departure badges, and compact list items.
- **Large Radius (`rounded-lg` / 1.0rem):** Applied to trip planner cards, bottom sheets, map overlays, and modal viewports.
- **Interactive Badges & Pill Buttons:** Retain an edge-to-edge pill shape (`9999px`) for transit mode switchers (Bus, Metro, Tram, Ferry) and rapid filtering chips.

## Components

### Buttons
- **Primary Action:** Solid `#059669` fill with white text, 0.5rem radius, and zero outline. Hover shifts to `#047857`. Focus state reveals a 2px offset ring in `#10B981`.
- **Secondary Action:** Mint-wash background (`#ECFDF5`), text and icon colored with `#064E3B`. Hover deepens to `#D1FAE5`.
- **Icon Buttons:** Circular or `rounded-md` 40px hit areas used for line switches, layer toggles, and geolocation triggers.

### Transit Chips & Pills
- **Line Identifiers:** Bold background containers with high-contrast text indicating line numbers (e.g., `#064E3B` for Metro Express, `#059669` for Local Green).
- **Interactive Filters:** `rounded-full` pills with `#F8FAFC` background and `#E2E8F0` border. Active state shifts background to `#F0FDF4`, border to `#10B981`, and text to `#064E3B`.

### Input Fields
- **Search & Stop Selectors:** Crisp white `#FFFFFF` surface with a 1px border in `#CBD5E1`. The left-hand adornment houses custom transit node graphics (origin circle, destination pin). Focus transitions border directly to `#059669` accompanied by a 3px diffused glow of `rgba(16, 185, 129, 0.15)`.

### Cards & Schedules
- **Live Departure Card:** Solid `#FFFFFF` background, `rounded-lg` borders framed with a 1px tint of `#E2E8F0`. Divided vertically using `0.5rem` row spacing. Real-time updates integrate pulsing emerald dots alongside tabular countdown typography (`title-md`).

### Checkboxes & Radios
- Square elements use 0.25rem radius; radio controls are circular. When checked, elements transition from `#E2E8F0` border to solid `#059669` fill with a white vector check/dot.

### Additional Transit-Specific Components
- **Step-by-Step Route Timeline:** Vertical track line in `#D1FAE5` connecting transfer nodes marked with 10px `#059669` geometric circles.
- **Disruption Alert Bar:** Surface container in `#FEF3C7` with `#92400E` text for maintenance warnings, or `#ECFDF5` with `#064E3B` text for all-clear operations.