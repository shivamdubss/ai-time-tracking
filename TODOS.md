# TODOS

## P1 — High Priority

### Confidence-based auto-matching with learning
**What:** Low-confidence matches show toast for confirm/dismiss. System learns from corrections — patterns stored per-matter in SQLite. After 3 confirmations, auto-assigns silently.
**Why:** Basic substring matching won't catch generic window titles ("Document1 - Word"). Learning from corrections makes matching smarter over time. This is the difference between auto-matching that works and auto-matching that's a gimmick.
**Effort:** M (human: ~4 days / CC: ~25 min)
**Depends on:** Client > Matter hierarchy (in progress)

## P2 — Medium Priority

### Live matter indicator in header
**What:** While tracking, header shows "Currently: Smith v. Jones · 2.3 hrs · $802" with matter color dot. Animates on matter switch.
**Why:** Builds trust in auto-matching. Passive confirmation without opening the dashboard.
**Effort:** XS (human: ~4 hours / CC: ~10 min)
**Depends on:** Client > Matter hierarchy, WebSocket matter switch message type

### 0.1-hour billing increments
**What:** Display time in 0.1hr format ("0.3" instead of "18m"). Configurable rounding: round-up (default), round-down, round-nearest. Minimum billing increment configurable.
**Why:** Industry standard for legal billing since the 1970s. Showing raw minutes feels foreign to lawyers.
**Effort:** XS (human: ~3 hours / CC: ~10 min)
**Depends on:** None (formatting change only)

## P3 — Nice to Have

### Matter color coding
**What:** Each matter gets unique color from professional palette. Colors appear in category bar, session table, matters list.
**Why:** Visual scanning — color is the fastest-processing visual channel.
**Effort:** XS (CC: ~10 min)

### Daily billable summary notification
**What:** Configurable time (default 5pm) notification: "Today: 5.8 billable hours, $2,023 value. 0.4 hrs unassigned."
**Why:** End-of-day accountability signal.
**Effort:** S (CC: ~15 min)

### Smart matter suggestions during creation
**What:** Auto-populate matter fields from detected window activity when creating a new matter.
**Why:** Reduces data entry friction.
**Effort:** S (CC: ~15 min)

### Matter activity sparklines
**What:** Mini trend chart in matters list showing recent activity.
**Why:** At-a-glance activity level per matter.
**Effort:** XS (CC: ~10 min)

### Quick-switch keyboard shortcut
**What:** Global hotkey for manual matter switch with fuzzy search dropdown.
**Why:** Escape hatch when auto-matching is wrong.
**Effort:** S (CC: ~15 min)

### Settings page with global default rate
**What:** Build Settings page with: default hourly rate, retention period, screenshot interval, API key config.
**Why:** Rate precedence currently requires per-client or per-matter rates. Global default needed for simpler setups.
**Effort:** S (CC: ~20 min)
**Depends on:** Client > Matter hierarchy
