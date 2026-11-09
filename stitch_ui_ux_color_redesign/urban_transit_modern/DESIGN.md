---
name: Urban Transit Modern
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#534434'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The brand identity embodies everyday urban movement in Olongapo City: dynamic, dependable, and community-centric. It elevates the grassroots tricycle commute into a transparent, safe, and modern municipal transit utility.

The design movement is **Modern Functional Transit**:
- **Clarity over ornament:** Interfaces prioritize fast recognition under bright tropical sunlight and rapid single-hand operation on mobile screens.
- **Warm civic authority:** A confident fusion of high-visibility transit amber and grounded deep navy, steering clear of cold, impersonal corporate palettes.
- **Tactile trust:** Interactive touch targets are generous, well-cushioned, and structured with crisp boundaries to instill passenger confidence and fair driver partnerships.

## Colors

The color system relies on high-visibility civic tones balanced by dark structural slates and pristine surfaces.

- **Primary Amber (`#F59E0B` / hover `#D97706`):** The primary signal for active trip states, route selection, and main calls to action. Pair with Navy (`#0F172A`) text for WCAG AAA compliance on high-visibility CTA buttons.
- **Secondary Deep Slate Navy (`#0F172A` / container `#1E293B`):** Establishes structural anchors—navigation headers, driver identity badges, typography, and foundational surfaces.
- **Tertiary Safety Emerald (`#10B981` / container `#ECFDF5`):** Reserved for ride validation, verified driver status badges, fare confirmation, and active GPS telemetry.
- **Neutral Canvas (`#F8FAFC` background, `#FFFFFF` surface, `#E2E8F0` border):** Keeps interfaces clean, legible, and glare-resistant under harsh outdoor sunlight.
- **System Destructive (`#EF4444` / container `#FEF2F2`):** Used exclusively for SOS triggers, cancellation warnings, and trip dispute indicators.

## Typography

Plus Jakarta Sans delivers geometric precision paired with friendly, modern legibility. Its wide apertures and balanced counters maintain clarity at small sizes on low-resolution devices or under direct outdoor sunlight.

- **Numerals & Metrics:** Fare prices, estimated arrival times (ETAs), and tricycle body plate numbers utilize bold weights (`700` and `800`) with tabular numeric styling (`font-variant-numeric: tabular-nums`) to prevent jitter during live fare calculation.
- **Hierarchy Rules:** Never use lighter than `400` weight. Street names and route badges default to `headline-md` or `label-lg` with tight tracking.

## Layout & Spacing

A fluid grid architecture built on an 8px rhythmic foundation, prioritizing one-handed ergonomic zones on handheld devices.

- **Mobile Viewports (<640px):** 4-column layout, 16px page margins (`margin`). Bottom sheet pattern hosts active route selection and booking steps within thumb-reach (bottom 45% of the viewport).
- **Tablet / In-Cab Terminals (640px–1024px):** 8-column layout, 24px margins. Split-screen layout: live map telemetry occupies 60% of the canvas; passenger/fare info cards occupy 40%.
- **Desktop / Dispatch Ops (>1024px):** 12-column layout, 32px margins (`margin-desktop`), with a maximum content container width of 1280px.
- **Touch Ergonomics:** All interactive targets (driver accept button, fare payment triggers, SOS) must adhere to a minimum size of 48px × 48px, padded by `space-sm` or greater.

## Elevation & Depth

Visual hierarchy uses clean surface stacking, light ambient shadows tinted with deep navy, and crisp structural borders rather than heavy drop shadows.

- **Level 0 (Flat Base):** `#F8FAFC`. Background canvas, non-interactive map tiles, layout framing.
- **Level 1 (Card & Section Surfaces):** Pure `#FFFFFF` surface with a subtle 1px border (`#E2E8F0`) and an ambient shadow: `0 2px 4px -1px rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Interactive Floating Elements):** Active ride trackers, floating map controls, and search bars: `0 8px 16px -2px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)`.
- **Level 3 (Modal Sheets & Drawer Overlays):** Dynamic booking panels and driver verification sheets: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.04)`.
- **Backdrop Treatments:** Modal sheets leverage a subtle frosted blur (`backdrop-filter: blur(8px)`) over map views, tinted with `rgba(15, 23, 42, 0.4)`.

## Shapes

A balanced, rounded shape language (`roundedness: 2`) creates a friendly and ergonomic interface.

- **Base Radius (`0.5rem` / 8px):** Input text fields, table containers, route segment badges, and driver document thumbnails.
- **Large Radius (`1rem` / 16px):** Primary content cards, fare selection tiles, and driver status modals.
- **Extra-Large Radius (`1.5rem` / 24px):** Slide-over booking trays and bottom sheet headers.
- **Full Pill (`9999px`):** Status pills (e.g., "En Route", "Verified Tricycle"), filter tags, count chips, and primary floating action buttons.

## Components

### Buttons
- **Primary CTA:** Background `#F59E0B`, text `#0F172A` (Semi-Bold `700`). Minimum height 52px on mobile. Hover shifts to `#D97706`. Focus state exhibits a 3px ring of `#F59E0B` with 2px white offset.
- **Secondary / Slate Action:** Background `#0F172A`, text `#FFFFFF`. Used for "Confirm Drop-off", "Driver Portal Login", and administrative tasks.
- **Ghost / Outline Button:** 1.5px border `#E2E8F0`, background transparent, text `#0F172A`. On hover, background shifts to `#F1F5F9`.

### Form Inputs & Pickers
- **Pick-up / Drop-off Fields:** Height 52px, 1.5px solid border `#E2E8F0`, interior background `#FFFFFF`. Active focus changes border to 2px solid `#F59E0B` with zero layout shift.
- **Validation Cues:** Inline error states show a `#EF4444` border and an alert icon beneath the input. Inline valid cues (e.g., promo code matched, exact terminal verified) show a `#10B981` indicator.

### Status Chips & Badges
- **Fare & Zone Badges:** Pill-shaped (`rounded-full`), padding `0.25rem 0.75rem`. 
- **Driver Verification:** Light emerald background (`#ECFDF5`), bold emerald text (`#065F46`), featuring a distinct checkmark icon.
- **Tricycle Route Chips:** Tinted background keyed to Olongapo zone colors (e.g., Blue, Yellow, or Red line franchises), overlaid with neutral-slate high-contrast text.

### Cards & Ride Containers
- **Booking / Terminal Cards:** Background `#FFFFFF`, 1px border `#E2E8F0`, border-radius 16px. Internal padding `1.25rem`. Clear distinction between terminal metadata and live meter pricing using bold tabular figures.
- **Driver Info Card:** Includes prominent vehicle number, driver portrait in a 48px circle, star rating chip, and quick-call/emergency anchor actions.

### Checkboxes & Radios
- **Radio Buttons (Payment / Vehicle Type):** Custom 20px circular controls. Selected state shows a 6px solid `#F59E0B` inner dot on a `#0F172A` border ring.
- **Checkboxes (Terms, Safety Checks):** 20px rounded squares (`rounded: 0.25rem`). Checked state uses `#0F172A` fill with a sharp white checkmark.

### Domain-Specific Components
- **Fare Breakdown Accordion:** Clear split between base flag-down rate, extra passenger surcharge, and distance multiplier.
- **Emergency Safety Floater (SOS):** Compact, high-visibility red-tinted control (`#EF4444`), anchored to the top-right corner during active trips for instant commuter protection.