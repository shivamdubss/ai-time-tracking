# Design System — TimeTrack

## Product Context
- **What this is:** Automatic time tracking app for macOS — passively monitors window titles and screenshots, uses Claude AI to generate session summaries, then destroys all raw data
- **Who it's for:** Solo founders, indie developers, freelancers who want honest time accounting without manual logging
- **Space/industry:** Productivity / time tracking (competitors: Toggl, Rize, Timing, Chronoid)
- **Project type:** Local web dashboard (React + Vite) served by FastAPI backend on localhost

## Aesthetic Direction
- **Direction:** Professional / Enterprise-clean — inspired by Cursor, Linear
- **Decoration level:** Minimal — the data itself (category bars, narratives) provides visual interest. No gratuitous ornamentation
- **Mood:** Legitimate, trustworthy, quiet confidence. The tool communicates competence through restraint. Color only appears where it encodes real information
- **Reference sites:** cursor.com, linear.app

## Typography
- **Display/Hero:** Satoshi (700, 900) — geometric with subtle humanist warmth. Clean authority without feeling corporate. Letter-spacing: -0.02em to -0.04em at large sizes
- **Body/UI:** Plus Jakarta Sans (400, 500, 600, 700) — slightly rounded terminals, friendly but professional. Excellent readability at small sizes
- **Data/Tables:** Geist Mono (400, 500, 600) — modern monospace with tabular-nums support. Clean, precise. Use for hours, timers, percentages, counts
- **Code:** JetBrains Mono (400) — if code ever appears in the UI
- **Loading:** Satoshi via Fontshare CDN (`api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap`), Plus Jakarta Sans + JetBrains Mono + Geist Mono via Google Fonts
- **Scale:**
  - xs: 12px / 0.75rem
  - sm: 14px / 0.875rem
  - base: 16px / 1rem
  - lg: 18px / 1.125rem
  - xl: 20px / 1.25rem
  - 2xl: 24px / 1.5rem
  - 3xl: 30px / 1.875rem
  - 4xl: 36px / 2.25rem
  - 5xl: 48px / 3rem
  - 6xl: 64px / 4rem

## Color

- **Approach:** Restrained — near-black for primary actions, neutral grays for everything else, color only for data encoding (categories) and semantic states

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | #FAFAFA | Page background |
| `--bg-surface` | #FFFFFF | Cards, table rows, inputs |
| `--bg-surface-hover` | #F5F5F5 | Hover state for surfaces |
| `--bg-sidebar` | #F5F5F5 | Sidebar background |
| `--bg-inset` | #F0F0F0 | Table headers, inset areas |
| `--border-default` | #E5E5E5 | Primary borders |
| `--border-subtle` | #F0F0F0 | Subtle dividers |
| `--text-primary` | #0A0A0A | Headings, primary text |
| `--text-secondary` | #525252 | Body text, narratives |
| `--text-muted` | #737373 | Labels, secondary info |
| `--text-faint` | #A3A3A3 | Placeholders, disabled text |
| `--accent-primary` | #171717 | Primary buttons, toggle tracks |
| `--accent-link` | #2563EB | Links, interactive highlights |

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | #0A0A0A | Page background |
| `--bg-surface` | #141414 | Cards, table rows, inputs |
| `--bg-surface-hover` | #1C1C1C | Hover state |
| `--bg-sidebar` | #111111 | Sidebar background |
| `--bg-inset` | #0A0A0A | Inset areas |
| `--border-default` | #262626 | Primary borders |
| `--border-subtle` | #1C1C1C | Subtle dividers |
| `--text-primary` | #FAFAFA | Headings, primary text |
| `--text-secondary` | #A3A3A3 | Body text |
| `--text-muted` | #737373 | Labels |
| `--text-faint` | #525252 | Placeholders |
| `--accent-primary` | #FAFAFA | Primary buttons (inverted) |
| `--accent-link` | #60A5FA | Links |

### Category Colors (same in both modes, backgrounds shift)
| Category | Color | Light BG | Dark BG |
|----------|-------|----------|---------|
| Coding | #0F766E | #F0FDFA | #042F2E |
| Communication | #C2410C | #FFF7ED | #431407 |
| Research | #4F46E5 | #EEF2FF | #1E1B4B |
| Meetings | #BE123C | #FFF1F2 | #4C0519 |
| Browsing | #475569 | #F8FAFC | #0F172A |

### Semantic Colors
| State | Color | Light BG | Dark BG |
|-------|-------|----------|---------|
| Success | #15803D | #F0FDF4 | #052E16 |
| Warning | #A16207 | #FEFCE8 | #422006 |
| Error | #DC2626 | #FEF2F2 | #450A0A |
| Info | #2563EB | #EFF6FF | #172554 |

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — generous whitespace makes data scannable without feeling sparse
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined — three-column session table as the core UI pattern
- **Grid:** Sidebar (220px fixed) + fluid main content
- **Session table columns:** Activity (1fr) | Hours (80px) | Narrative (1.2fr)
- **Max content width:** 1200px for the preview/marketing, no max for the dashboard itself
- **Border radius:** sm(6px) md(10px) lg(14px) full(9999px) — soft but not bubbly

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(150ms) medium(250ms) long(400ms)
- **Specific animations:**
  - Hover states: 100ms ease color/background transition
  - Row expand/collapse: 250ms ease-out height + opacity
  - Timer pulse: 2s infinite opacity animation on the recording dot
  - Page transitions: 150ms ease-out fade
  - Processing spinner: custom, not generic

## Shadows
- **sm:** `0 1px 2px rgba(0,0,0,0.04)` — subtle lift for active nav items, buttons
- **md:** `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` — cards on hover
- **lg:** `0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)` — modals, dashboard mockup frame

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Neutral/enterprise palette over warm/amber | User wants to communicate legitimacy and professionalism, inspired by Cursor |
| 2026-03-26 | Near-black (#171717) as primary action color | Authoritative, professional — matches Cursor's approach of black CTAs |
| 2026-03-26 | Category colors as only expressive color | Color earns its place by encoding data, not decoration |
| 2026-03-26 | Light mode as default | Professional, clean. Dark mode available but not primary |
| 2026-03-26 | Satoshi + Plus Jakarta Sans + Geist Mono | Geometric authority (display) + friendly readability (body) + modern precision (data) |
| 2026-03-26 | Slightly desaturated category colors | More professional than saturated equivalents, still clearly distinguishable |
