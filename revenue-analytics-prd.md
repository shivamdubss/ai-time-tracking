# Revenue Analytics PRD

## 1. Overview & Goals

**Problem:** Solo attorneys track time but lack visibility into billing efficiency. They don't know their utilization rate, which matters consume the most time, or whether they're on pace to hit revenue targets. End-of-month surprises lead to under-billing and poor practice management decisions.

**Solution:** A dedicated Revenue Analytics page that aggregates existing activity data into actionable KPIs, trend charts, and ranked tables — all computed locally from SQLite data.

**Success metrics:**

- Attorney can answer "Am I on pace this month?" in under 5 seconds
- Utilization rate visible at a glance with target comparison
- Revenue forecast updates daily based on current billing pace

**Non-goals (Phase 2):**

- Collection rate tracking (requires invoicing from Phase 3)
- Firm-level multi-timekeeper reporting (Phase 4)
- Comparative benchmarking against industry averages

---

## 2. KPIs & Metrics

### Primary KPIs (Summary Cards)

| Metric | Formula | What It Tells You | Target |
|--------|---------|-------------------|--------|
| Billable Hours | `SUM(activities.minutes) WHERE billable=true / 60` | Total billable time in period | Varies by attorney |
| Revenue (Billed Value) | `SUM(roundToDecimalHours(minutes) × effective_rate) WHERE billable=true` | Dollar value of tracked billable work | — |
| Utilization Rate | `billable_hours / available_hours × 100` | % of available time spent on billable work | 60-80% |
| Effective Rate | `total_revenue / total_billable_hours` | Blended rate across all matters | Should match or exceed target rate |

**Available hours default:** 8 hours/day × working days in period. Configurable in Settings (e.g., 6 hrs/day for part-time practitioners). Weekends excluded by default.

### Secondary KPIs

| Metric | Formula | Purpose |
|--------|---------|---------|
| Realization Rate | `billed_hours / total_worked_hours × 100` | How much tracked time is billable vs. total |
| Revenue Forecast | `(revenue_so_far / working_days_elapsed) × working_days_remaining` | Projected monthly revenue at current pace |
| Average Daily Billable | `billable_hours / working_days_elapsed` | Daily billing pace |
| Non-Billable Hours | `SUM(minutes) WHERE billable=false / 60` | Administrative overhead |

---

## 3. Page Layout

**Route:** `/analytics` (new sidebar nav item between Timesheet and Clients)

**Page structure (top to bottom):**

```
┌─────────────────────────────────────────────────┐
│  Revenue Analytics          [Period Selector]    │  ← Page header with period controls
├─────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │Billed│ │Revenue│ │Util. │ │Eff.  │          │  ← 4 summary KPI cards
│  │Hours │ │ $$$  │ │Rate %│ │Rate $│          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
├─────────────────────────────────────────────────┤
│  Billable Hour Trend          Revenue Forecast  │  ← 2-column chart row
│  [Bar chart: daily hours]     [Projected line]  │
├─────────────────────────────────────────────────┤
│  Hours by Category            Hours by Matter   │  ← 2-column: donut + ranked table
│  [Donut chart]                [Sorted table]    │
└─────────────────────────────────────────────────┘
```

**Responsive:** On mobile (<768px), all 2-column sections stack to single column. KPI cards become 2×2 grid.

---

## 4. Time Period Controls

**Period selector** (top-right of page header):

- **Presets:** Today, This Week, This Month (default), Last Month, This Quarter, Year to Date
- **Custom:** Date range picker (start date → end date)
- Selecting a period re-fetches all analytics data

**Period comparison (v2 enhancement):** Show delta vs. previous period (e.g., "↑ 12% vs. last month"). Not required for initial launch.

---

## 5. Charts & Visualizations

**Library:** Recharts (lightweight, React-native, composable, MIT license). Install `recharts` as frontend dependency.

### 5a. Billable Hour Trend (Bar Chart)

- **Type:** Vertical bar chart
- **X-axis:** Date (daily bars for week/month; weekly bars for quarter/year)
- **Y-axis:** Hours (decimal, Geist Mono font)
- **Bars:** Stacked — billable (`#171717`) + non-billable (`#E5E5E5`)
- **Target line:** Horizontal dashed line at daily billable target (configurable, default 6.0 hrs)
- **Hover tooltip:** Date, billable hours, non-billable hours, revenue for that day

### 5b. Revenue Forecast (Area Chart)

- **Type:** Area chart with projection
- **X-axis:** Date (days of current month)
- **Y-axis:** Cumulative revenue ($, Geist Mono)
- **Solid area:** Actual cumulative revenue through today
- **Dashed area:** Projected revenue (linear extrapolation from current pace) through end of month
- **Reference line:** Monthly revenue target (if set in settings)
- **Colors:** Solid fill `#171717` at 10% opacity, dashed projection `#171717` at 5% opacity, stroke `#171717`

### 5c. Hours by Category (Donut Chart)

- **Type:** Donut/ring chart
- **Segments:** One per legal category, using existing `CATEGORY_BAR_COLORS`:
  - Legal Research: `#4F46E5`
  - Document Drafting: `#0F766E`
  - Client Communication: `#C2410C`
  - Court & Hearings: `#BE123C`
  - Case Review: `#475569`
  - Administrative: `#737373`
- **Center text:** Total hours (Geist Mono, 2xl)
- **Legend:** Category name + hours + percentage (below chart)
- **Interaction:** Hover highlights segment, shows exact hours and revenue

---

## 6. Data Tables

### 6a. Hours by Matter (Ranked Table)

| Column | Content | Sort |
|--------|---------|------|
| Rank | # | — |
| Client / Matter | Client name → Matter name | Alpha |
| Hours | Billable hours (decimal, Geist Mono) | Default: desc |
| Revenue | Hours × effective_rate ($) | Sortable |
| % of Total | Percentage of total billable hours | — |
| Avg Rate | Effective blended rate for this matter | Sortable |

- Top 10 matters shown by default, "Show all" expands
- Click matter row → navigates to Timesheet filtered by that matter (future enhancement)
- Excludes non-billable internal matters unless toggled

### 6b. Hours by Category (Table — below donut chart)

| Column | Content |
|--------|---------|
| Category | Category name with color dot |
| Billable Hours | Hours where billable=true |
| Non-Billable Hours | Hours where billable=false |
| Total Hours | Sum |
| Revenue | Billable hours × rates |
| % of Total | Percentage |

---

## 7. Empty States

**No data at all (new user):**

> "Start tracking to see your billing analytics. Revenue insights will appear here once you have completed sessions with billable activities."
>
> [Start Tracking] button linking to Timeline page

**No data for selected period:**

> "No activity recorded for [period name]. Try selecting a different time range."

**Partial data (activities exist but no rates configured):**

> "Revenue calculations require hourly rates. Set rates on your matters or clients to see revenue data."
>
> [Configure Rates →] link to Clients & Matters page

**Charts with insufficient data:**

- Trend chart: Show available days, no projection if < 3 data points
- Donut chart: Show "No category data" message if no activities exist

---

## 8. API Endpoints

All new endpoints under `/api/analytics/`.

### GET /api/analytics/summary

**Params:** `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)

**Returns:**

```json
{
  "billable_hours": 42.5,
  "non_billable_hours": 8.2,
  "total_hours": 50.7,
  "revenue": 14875.00,
  "effective_rate": 350.00,
  "utilization_rate": 0.72,
  "realization_rate": 0.84,
  "available_hours": 59.0,
  "working_days": 8,
  "forecast": {
    "projected_monthly_revenue": 38500.00,
    "daily_average_billable": 5.31,
    "working_days_remaining": 14
  }
}
```

**SQL:** Aggregates from `activities JOIN sessions WHERE sessions.start_time BETWEEN dates AND sessions.status = 'completed'`.

### GET /api/analytics/trend

**Params:** `start_date`, `end_date`, `granularity` (day|week|month)

**Returns:**

```json
{
  "data": [
    { "date": "2026-03-01", "billable_hours": 6.2, "non_billable_hours": 1.1, "revenue": 2170.00 },
    { "date": "2026-03-02", "billable_hours": 5.8, "non_billable_hours": 0.8, "revenue": 2030.00 }
  ]
}
```

**SQL:** `GROUP BY date(sessions.start_time)`, aggregate activity minutes and revenue per day.

### GET /api/analytics/by-matter

**Params:** `start_date`, `end_date`, `limit` (default 10)

**Returns:**

```json
{
  "data": [
    {
      "matter_id": "uuid",
      "matter_name": "Smith v. Jones",
      "client_name": "John Smith",
      "billable_hours": 12.3,
      "revenue": 4305.00,
      "effective_rate": 350.00,
      "percentage": 28.9
    }
  ],
  "unassigned": { "hours": 2.1, "revenue": 0 }
}
```

### GET /api/analytics/by-category

**Params:** `start_date`, `end_date`

**Returns:**

```json
{
  "data": [
    { "category": "Legal Research", "billable_hours": 14.2, "non_billable_hours": 0, "revenue": 4970.00, "percentage": 33.4 },
    { "category": "Administrative", "billable_hours": 0, "non_billable_hours": 6.1, "revenue": 0, "percentage": 14.3 }
  ]
}
```

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Activities with no rate | Include in hour counts, exclude from revenue. Show "—" for revenue column. |
| Activities with no matter | Group under "Unassigned" in by-matter view. Include in all other metrics. |
| Non-billable activities | Include in total hours, exclude from billable hours, utilization rate, and revenue. Show in non-billable column. |
| Zero billable hours in period | Show 0% utilization, $0 revenue. Charts show empty state with message. |
| Partial day (tracking started mid-day) | Count available hours for the full day. Don't pro-rate. |
| Weekends with tracked time | Include in metrics but do NOT count toward available hours (unless user configures weekends as working days). |
| Activities spanning midnight | Attribute to the day of `start_time`. |
| Very long periods (year) | Trend chart switches to weekly/monthly granularity automatically. |
| Rate changes mid-period | Each activity uses its own `effective_rate` at time of creation. No retroactive recalculation. |

---

## 10. Settings Integration

New settings fields (added to existing Settings page):

| Setting | Default | Purpose |
|---------|---------|---------|
| Available hours per day | 8.0 | Used for utilization rate calculation |
| Daily billable target | 6.0 | Shown as target line on trend chart |
| Monthly revenue target | (none) | Shown as reference line on forecast chart |
| Working days | Mon-Fri | Which days count toward available hours |

---

## 11. Navigation & Routing

- **New route:** `/analytics` → `<AnalyticsPage />`
- **Sidebar:** Add "Analytics" nav item with `BarChart3` icon (from lucide-react), positioned between "Timesheet" and "Clients"
- **Page title:** "Revenue Analytics"

---

## 12. Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| recharts | ^2.x | Charts (bar, area, donut, heatmap cells via custom component) |

No other new dependencies required.

---

## 13. Files to Create/Modify

### New files:

- `frontend/src/pages/AnalyticsPage.tsx` — main page component
- `frontend/src/hooks/useAnalytics.ts` — data fetching hook for analytics endpoints
- `frontend/src/components/analytics/SummaryCards.tsx` — 4 KPI cards
- `frontend/src/components/analytics/BillableHourTrend.tsx` — bar chart
- `frontend/src/components/analytics/RevenueForecast.tsx` — area chart
- `frontend/src/components/analytics/CategoryBreakdown.tsx` — donut chart + table
- `frontend/src/components/analytics/MatterRanking.tsx` — ranked table
- `frontend/src/components/analytics/PeriodSelector.tsx` — period control
- `backend/routes/analytics.py` — all analytics API endpoints

### Modified files:

- `frontend/src/App.tsx` — add `/analytics` route
- `frontend/src/components/layout/Sidebar.tsx` — add Analytics nav link
- `frontend/src/lib/api.ts` — add analytics API methods
- `frontend/src/lib/types.ts` — add analytics response types
- `backend/main.py` — register analytics router
- `backend/database.py` — add analytics query functions

---

## Verification

- PRD covers all Phase 2 roadmap analytics items except Collection Rate (deferred to Phase 3)
- All metrics use existing data model fields (`activities.minutes`, `effective_rate`, `billable`, `start_time`, `category`, `matter_id`)
- API endpoints map cleanly to SQL aggregations on existing tables
- Design follows DESIGN.md (Geist Mono for data, category colors for charts, minimal decoration)
- Scoped for solo attorney, not firm-level
