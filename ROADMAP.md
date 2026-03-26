# TimeTrack Product Roadmap

> **Vision**: TimeTrack is the time tracking tool that works the way your brain wishes it could — silently observing, intelligently summarizing, and ruthlessly protecting your privacy. We are building the most trusted, AI-native productivity tool for professionals who value their time and their data equally.

**Target audience**: Developers, freelancers, consultants, and agencies who need honest time accounting without surveillance-tool anxiety.

**Core principles** (apply to every phase):
1. **Privacy is non-negotiable** — all data stays local unless the user explicitly opts in
2. **AI earns its place** — every AI feature must save real time, not just demo well
3. **Professional aesthetic** — enterprise-clean, inspired by Cursor and Linear
4. **Passive by default** — the best time tracker is one you forget is running

---

## Phase 1 — Foundation (Q2 2026)

*Theme: Complete the core experience. Fill in the placeholder pages, make the app feel finished.*

### Settings Page
Build out the Settings view. Includes: Anthropic API key configuration, screenshot capture interval (15s / 30s / 60s), window polling interval, data retention period (7 / 14 / 30 days), startup behavior preferences, and theme selection.

### Rules & Categorization Engine
Let users define custom categorization rules: map specific apps or URL patterns to categories, create custom categories beyond the default five (Coding, Communication, Research, Meetings, Browsing), set up keyword-based overrides, and configure activity grouping preferences.

### Idle Detection
Detect periods of inactivity (no mouse/keyboard input) and automatically pause tracking. Configurable idle threshold (default: 5 minutes). On resume, prompt the user to label the idle period (break, meeting away from computer, etc.) or discard it.

### Menu Bar Companion
Native macOS menu bar widget. Shows tracking state with elapsed time, provides start/stop without opening the browser, displays today's total tracked hours, and includes a quick "Open Dashboard" action.

### Session Editing
Allow users to edit AI-generated narratives after the fact. Support manual time adjustments (trim start/end time). Add the ability to split a session into two or merge adjacent sessions.

### Infrastructure: Database Encryption
Encrypt the local SQLite database at rest using SQLCipher or application-level encryption. Key derived from the macOS Keychain. Ensures session summaries and metadata are protected even if the device is compromised.

---

## Phase 2 — Intelligence (Q3 2026)

*Theme: Move from "summarize what happened" to "help me understand my patterns."*

### Analytics Dashboard
Daily/weekly/monthly time breakdowns, category distribution over time (stacked area charts), app usage rankings, productivity trends, peak productivity hours heatmap, and period-over-period comparison.

### Retroactive Entry Generation
Allow users to generate time entries from historical window activity data — not just from active start/stop sessions. The system reconstructs what the user was working on from window logs captured during optional "always-on" background monitoring, then generates draft entries the user can review, edit, and confirm. Transforms TimeTrack from a session-based tool into a continuous time capture platform.

### Smart Categorization & Compliance Rules
Evolve the Rules engine into a policy system. Define time allocation policies (e.g., "no more than 20% on Communication apps"), flag sessions that violate rules, support auto-tagging based on patterns (e.g., "any VS Code window with 'client-x' in the title → Project X"), and surface anomalies in the Analytics dashboard.

### Predictive Time Estimates
Using historical data, predict how long tasks will take. When a user starts working in a familiar context (same repo, same project), show an estimated duration based on past sessions. Surface "you usually spend X hours on this type of work" insights.

### Multi-Monitor Support
Track activity across all connected displays. Capture screenshots from the active window regardless of which monitor it is on.

### Infrastructure: Background Daemon
Refactor the tracking engine to run as a proper macOS background daemon (launchd) independent of the FastAPI server. Enables always-on passive capture for retroactive entry generation, survives browser tab closures, and starts automatically on login.

---

## Phase 3 — Professional (Q4 2026)

*Theme: Make TimeTrack worth paying for. Launch premium features, pricing, and the referral program.*

### Project & Client Management
Assign sessions and activities to projects and clients. Create a project hierarchy (Client > Project > Task). Auto-suggest assignments based on rules and past patterns. Track billable vs. non-billable time. Generate per-project and per-client time reports.

### Export & Integrations
Export time data to CSV, JSON, PDF reports. Direct integrations with Toggl, Harvest, and Clockify. Calendar integration (Google Calendar, Apple Calendar) to correlate meetings with tracked time. Webhook support for custom integrations.

### Invoicing & Reporting
Generate professional time reports suitable for client billing. Customizable report templates. Hourly rate configuration per project/client. PDF export with branding. Weekly/monthly auto-generated summary reports.

### Pomodoro & Focus Modes
Built-in Pomodoro timer (25/5 or custom intervals). Focus mode that tracks deep work sessions separately. Break reminders with configurable intervals. Pomodoro sessions appear in the same timeline with a distinct visual indicator.

### Premium Tier & Licensing
Introduce a freemium model:
- **Free**: All current MVP features, 5 AI summaries/day, 3 custom rules, 7-day retention
- **Premium**: Unlimited AI summaries, unlimited rules, retroactive entry generation, advanced analytics, project/client management, all export formats, 90-day retention

License validation via a lightweight local key system — no account required for free tier.

### Referral Program
See dedicated section below.

### Infrastructure: Auto-Updates
Auto-update via Sparkle framework. Signed updates with Ed25519. Delta updates to minimize download size.

---

## Phase 4 — Team (Q1–Q2 2027)

*Theme: Expand from solo to team use. Privacy-preserving collaboration for agencies and small teams.*

### Team Workspaces
Optional team features for agencies and small companies. Each member runs TimeTrack locally with full privacy. Shared project/client definitions sync across the team. Aggregated time reports at the team level. No raw data or screenshots ever leave the individual device.

### Approval Workflows
Team leads can review submitted time entries before finalization. Comment and request changes on entries. Approval status tracking (draft → submitted → approved → rejected). Designed for agencies billing clients who need sign-off.

### Colleague Tagging & Collaboration Context
Tag activities as collaborative (pair programming, group meetings). Link time entries across team members in the same meeting or task. Generate team-level narratives ("The team spent 14 hours on Project X this week, primarily on API integration").

### Workload Analysis
Team-level analytics: capacity planning, workload distribution, burnout risk indicators based on hours tracked and patterns. Designed to empower individuals managing their own time — not surveillance.

### Infrastructure: Cloud Sync (Optional, Encrypted)
End-to-end encrypted sync for multi-device access or team features. Zero-knowledge architecture — the server never sees decrypted data. Self-host option for enterprises. iCloud-based sync as a simpler alternative for solo users.

---

## Phase 5 — Platform (Q3–Q4 2027)

*Theme: Become the time intelligence platform. Open up to integrations and third-party extensions.*

### Plugin & Extension System
Third-party developers can build TimeTrack extensions. Plugin API for custom categorization logic, analytics views, and export formats. Curated plugin marketplace. Example plugins: Jira time logging, GitHub commit correlation, Slack status sync.

### Public API & Webhooks
REST API for programmatic access to time data. Webhook notifications for session events. OAuth2 for third-party authorization. CLI tool for scripting and automation.

### Advanced AI Features
- AI-powered weekly retrospectives ("Here's what you accomplished this week")
- Goal tracking with AI coaching ("You wanted 60% coding — you're at 45%")
- Natural language queries ("How much time on Project X last month?")
- Meeting prep summaries ("Before your 2pm with Client Y, here's your recent work for them")

### Cross-Platform Groundwork
Research and prototype Windows and Linux support. Abstract the macOS-specific tracking layer behind a platform interface. Evaluate Tauri for a cross-platform desktop shell.

### Infrastructure: SOC 2 Preparation
Formal security audit. Document data handling practices. Penetration testing. Prepare for SOC 2 Type I certification for enterprise customers.

---

## Phase 6 — Scale (2028+)

*Theme: Enterprise readiness and market expansion.*

### Enterprise Features
SSO/SAML integration. Admin console for organization-wide settings and policies. Audit logging. Role-based access control (admin, manager, member). Custom data retention policies per organization.

### Self-Hosted Deployment
Docker-based self-hosted option for enterprises requiring data residency. Helm charts for Kubernetes. Air-gapped installation support. Enterprise support tier.

### Mobile Companion
iOS/Android app for reviewing time entries on the go. Push notifications for daily/weekly summaries. Quick manual time entry for activities away from the computer. Read-only sync from the desktop app.

### Marketplace & Ecosystem
Certified integration partners. Template marketplace (report templates, rule templates, dashboard layouts). Community-contributed plugins. Developer documentation and SDK.

---

## Referral Program

### Overview
The TimeTrack Referral Program launches alongside the Premium tier in Phase 3. Designed to grow organically among professionals who share productivity tools with their network. No complex point systems or cheap gamification — just straightforward value for both parties.

### How It Works
Every TimeTrack user (free or premium) gets a unique referral link from the Settings page. When someone installs TimeTrack using that link and completes their first tracked session, both parties receive rewards.

### Reward Tiers

| Milestone | Referrer Reward | New User Reward |
|-----------|----------------|-----------------|
| 1st referral | 1 free month of Premium | 1 free month of Premium (extended trial) |
| 3 referrals | 1 additional free month | — |
| 5 referrals | Lifetime unlock: Advanced Analytics | — |
| 10 referrals | 3 additional free months (5 total earned) | — |
| 25 referrals | **Lifetime Premium** (Ambassador status) | — |

### New User Incentive
Every referred user receives a **1-month Premium trial** (instead of the standard 14-day trial). Enough time to experience retroactive entry generation, advanced analytics, and project management — the features most likely to convert.

### Ambassador Program
Users who reach 25 referrals earn **Ambassador** status:
- Lifetime Premium access
- Ambassador badge in profile
- Early access to beta features
- Direct feedback channel to the development team

Ambassadors are TimeTrack's most engaged users — their input shapes the product roadmap.

### Implementation Details
- **Referral link**: `timetrack.app/r/{short-code}` — clean, shareable, memorable
- **Tracking**: Attribution stored locally on the new user's device at install time. Validated on first Premium activation or trial start. No tracking pixels or third-party analytics — consistent with privacy-first positioning
- **Reward delivery**: Free months applied automatically as license extensions. Feature unlocks activated immediately. No manual claiming required
- **Fraud prevention**: One reward per unique device. Referral only counts after the referred user completes at least one tracked session. Self-referral detection via device and API key matching
- **Dashboard**: Referral section in Settings showing total referrals, pending activations, earned rewards, and a shareable link with copy button

### Suggested Share Moments
The app surfaces referral prompts at natural moments:
- After a particularly useful AI summary: *"Know someone who'd love this? Share TimeTrack."*
- After a weekly milestone: *"You tracked 32 hours this week — know someone who would benefit?"*
- In the weekly retrospective email (Phase 5)

### Premium Feature Comparison

| Feature | Free | Premium | Referral Unlock (5+) |
|---------|------|---------|----------------------|
| Session tracking | Unlimited | Unlimited | Unlimited |
| AI summarization | 5/day | Unlimited | Unlimited |
| Default categories | 5 | 5 | 5 |
| Custom rules | 3 | Unlimited | Unlimited |
| Analytics | 7-day view | Full history | Full history |
| Retroactive entries | — | Yes | — |
| Project management | — | Yes | — |
| Export formats | CSV only | All formats | All formats |
| Data retention | 7 days | 90 days | 30 days |

---

## What's Already Shipped (MVP)

- [x] Start/stop session tracking with live timer
- [x] Window activity logging (active app + window title, every 3s)
- [x] Screenshot capture (every 30s, secure temp directory)
- [x] AI summarization via Claude (summaries, categories, per-activity narratives)
- [x] Five default categories with color-coded visualization
- [x] SQLite local database with 7-day auto-pruning
- [x] REST API + WebSocket real-time updates
- [x] Session table with expandable rows, category bars, category pills
- [x] Day navigation
- [x] Light/dark theme
- [x] macOS permission detection + onboarding
- [x] Privacy-first: all data local, no telemetry, screenshots deleted after summarization
- [x] Local auth token for API security

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| [x] | Shipped |
| Planned | Committed to roadmap |
| Exploring | Under consideration |

---

*This roadmap is a living document. Priorities shift based on user feedback, technical discoveries, and market conditions. Last updated: March 2026.*
