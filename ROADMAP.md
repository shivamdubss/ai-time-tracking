# TimeTrack Product Roadmap

> **Vision**: TimeTrack is the only AI-powered time tracker built for attorney-client privilege. It silently captures your billable work, generates compliant billing narratives, and never sends a byte of client data to the cloud. We are building the most trusted billing intelligence tool for lawyers who refuse to choose between efficiency and ethics.

**Target audience**: Solo practitioners, small law firms (2-10 attorneys), and mid-size firms who need to recover lost billable hours without compromising client confidentiality.

**Core principles** (apply to every phase):
1. **Privilege is non-negotiable** — all client data stays on-device; no cloud processing that could waive attorney-client privilege (ABA Model Rule 1.6)
2. **AI earns its place** — every AI feature must recover real billable time, not just demo well
3. **Professional aesthetic** — enterprise-clean, inspired by Clio and Linear; designed for the credibility standards of legal professionals
4. **Passive by default** — the best time tracker is one you forget is running while you practice law

---

## Phase 1 — Foundation (Q2 2026)

*Theme: Transform the core experience from developer tool to legal billing instrument. Make TimeTrack usable for a solo practitioner on day one.*

### Client & Matter Hierarchy
Replace the flat session model with a legal-native Client > Matter structure. Every time entry must be assignable to a specific matter. Clients have: name, contact info, billing address, default rate, and an optional IOLTA trust indicator. Matters have: matter name, matter number, client reference, status (active/closed/pending), date opened, practice area, and billing type (hourly/flat/contingency). The sidebar navigation adds a "Matters" section showing active matters grouped by client. Unassigned time entries appear in an "Unbilled" bucket for later classification.

### Legal Activity Categories
Replace the five developer categories (Coding, Communication, Research, Meetings, Browsing) with legal practice categories:
- **Legal Research** (Westlaw, LexisNexis, Fastcase, Google Scholar, court websites)
- **Document Drafting** (Word, Adobe Acrobat, document management systems)
- **Client Communication** (email, phone, video calls, messaging apps)
- **Court & Hearings** (Zoom/Teams court appearances, e-filing systems, court portals)
- **Case Review** (reviewing discovery, case files, evidence, exhibits)
- **Administrative** (billing, calendar, firm management, non-billable work)

The AI summarizer is updated to classify activities into these categories and generate narratives in legal billing format.

### 0.1-Hour Billing Increments
The legal industry bills in 6-minute (0.1 hour) increments — standard since the 1970s. All time display throughout the app changes from raw minutes to 0.1hr increments. Rounding is configurable: round-up (default), round-down, or round-nearest. The session table "Hours" column displays values like "0.3" or "1.7" instead of "18m" or "1:42." Minimum billing increment is configurable (0.1hr default, 0.25hr for firms using quarter-hour billing).

### Legal Billing Narratives
The AI summarization prompt generates billing-compliant narratives following the legal format: **action verb + what + why/for whom**. Examples:
- "Researched case law regarding motion to compel discovery responses in Smith v. Jones"
- "Drafted and revised demand letter to opposing counsel regarding settlement terms"
- "Reviewed and annotated deposition transcript of expert witness Dr. Williams"
- "Participated in telephone conference with client regarding litigation strategy"

Narratives avoid vague language ("worked on case") and include enough specificity to survive a billing dispute or fee petition review under ABA Rule 1.5. The AI generates block billing warnings when a single entry spans multiple distinct tasks (block billing is disfavored and often leads to fee reductions).

### Rate Tables
Basic rate configuration: per-timekeeper hourly rate (default), per-client rate override, and per-matter rate override. The most specific rate wins (matter > client > default). Each time entry displays its billable value (hours x rate) alongside the hours. The daily total footer shows both total hours and total billable value.

### Billable vs. Non-Billable Classification
Each time entry and activity is marked as billable or non-billable. The AI auto-classifies based on category (Administrative defaults to non-billable; all others default to billable). Users can override per-entry. The dashboard shows separate totals for billable and non-billable hours. The "Administrative" category displays with muted styling to visually separate it from revenue-generating work.

### Settings Page
Build out the Settings view. Includes: Anthropic API key configuration, screenshot capture interval (15s / 30s / 60s), window polling interval, data retention period (7 / 30 / 90 / 365 days), startup behavior preferences, theme selection, default hourly rate, default billing increment (0.1hr / 0.25hr), minimum entry threshold, and practice area defaults.

### Idle Detection
Detect periods of inactivity (no mouse/keyboard input) and automatically pause tracking. Configurable idle threshold (default: 5 minutes). On resume, prompt the user to label the idle period — common legal options: phone call (billable), client meeting away from desk (billable), personal break (non-billable), court appearance (billable), or discard entirely.

### Session Editing
Allow users to edit AI-generated billing narratives after summarization. Support manual time adjustments (trim start/end time, adjust to nearest 0.1hr increment). Add the ability to split a session into multiple entries (common when a lawyer works on multiple matters in one sitting) or merge adjacent entries for the same matter.

### Infrastructure: Database Schema Migration
Migrate the SQLite schema from the flat session model to support: clients table, matters table, time entries with matter_id foreign key, rate_schedules table, and a settings table. Add migration tooling to handle schema changes for existing users. Encrypt the local SQLite database at rest using SQLCipher or application-level encryption. Key derived from the macOS Keychain. Ensures privileged billing data is protected even if the device is compromised.

---

## Phase 2 — Intelligence (Q3 2026)

*Theme: Move from "summarize what happened" to "recover every billable minute you earned."*

### Retroactive Billing Entry Generation
Allow users to generate time entries from historical window activity data — not just from active start/stop sessions. The system reconstructs what the lawyer was working on from window logs captured during optional "always-on" background monitoring, then generates draft billing entries the user can review, assign to matters, edit narratives, and confirm. This is the killer feature: it captures the 10-15% of billable time lost to end-of-day reconstruction and up to 50% lost with end-of-week entry. Transforms TimeTrack from a session-based tool into a continuous billable time recovery platform.

### UTBMS Task Code Auto-Suggestion
Implement the Uniform Task-Based Management System (UTBMS) code taxonomy. The AI analyzes each billing entry and suggests the appropriate UTBMS task code (L-codes for litigation, P-codes for project/transactional, A-codes for appeals, etc.). Codes are displayed as a selectable dropdown alongside each entry. Required for LEDES invoicing and increasingly demanded by corporate clients and insurance companies.

### Matter Auto-Matching
The AI learns from window activity patterns which matter a lawyer is working on. When a window title contains a client name, case number, or matter keyword, TimeTrack auto-suggests the matter assignment. Learns from user confirmations over time. Reduces matter assignment friction from "select from dropdown every time" to "confirm AI suggestion with one click." Pattern matching is entirely local — no client names or matter details ever leave the device.

### Billing Analytics Dashboard
Daily/weekly/monthly time breakdowns with legal-specific KPIs:
- **Utilization rate**: billable hours / available hours (target: 60-80%)
- **Realization rate**: billed hours / worked hours (target: 90%+)
- **Collection rate**: collected / billed (tracked after Phase 3 invoicing)
- **Hours by matter**: ranked list of matters consuming the most time
- **Hours by category**: distribution across legal activity types
- **Revenue forecast**: projected billings based on current pace and rates
- **Billable hour trend**: daily/weekly billable hour chart with target line
- **Peak productivity hours**: heatmap showing when the lawyer does their best billable work

### Split Billing
Support splitting a single time entry across multiple matters — common when a legal research session benefits multiple cases. Specify percentage or hour allocation per matter. The split entries appear independently in each matter's billing record with appropriate narratives.

### Multi-Monitor Support
Track activity across all connected displays. Capture screenshots from the active window regardless of which monitor it is on. Important for lawyers who often have case documents on one screen and research on another.

### Infrastructure: Background Daemon
Refactor the tracking engine to run as a proper macOS background daemon (launchd) independent of the FastAPI server. Enables always-on passive capture for retroactive billing entry generation, survives browser tab closures, and starts automatically on login. Critical for the "forgot it was running" passive capture experience that maximizes billable hour recovery.

---

## Phase 3 — Professional (Q4 2026)

*Theme: Make TimeTrack worth paying for. Launch billing workflow features, integrations, and premium pricing suited to legal professionals.*

### Clio Manage Integration
Clio is the #1 legal practice management platform with 150K+ users and 70+ bar association endorsements. Integrate via Clio's REST API v4 with OAuth 2.0:
- **Sync matters**: pull client/matter list from Clio for assignment
- **Push time entries**: export approved time entries to Clio with narratives, UTBMS codes, and rates
- **Two-way sync**: entries created in either system stay in sync
- **Bulk export**: send a full day or week of entries to Clio in one action

This is the single most impactful feature for adoption at firms already using Clio.

### LEDES Export
Generate invoices in LEDES (Legal Electronic Data Exchange Standard) format — the industry standard for electronic billing. Support LEDES 1998B (most common) and LEDES 2000. Includes: invoice number, timekeeper ID, UTBMS codes, billing narratives, rates, and matter references. Required by most corporate legal departments and insurance companies. Export to `.ledes` file for upload to e-billing platforms (Legal Tracker, Collaborati, BillBlast).

### Pre-Bill Editing Workflow
Implement the pre-bill review workflow that 94% of firms say burns excessive time:
- **Draft**: AI-generated entries land here automatically
- **Review**: lawyer reviews narratives, adjusts time, assigns matters
- **Approved**: entries ready for invoicing
- **Sent**: entries exported to Clio or LEDES file

Batch operations: approve all entries for a matter, bulk-edit narratives, bulk-adjust rounding. Pre-bill summary view shows: total hours, total value, entries by matter, and flags potential issues (block billing, excessive hours for task type, missing UTBMS codes).

### Trust Accounting Awareness (IOLTA)
Mark clients with trust/retainer accounts. When generating invoices, TimeTrack displays trust balance alongside the invoice total. Warning indicators when an invoice would exceed the trust balance. TimeTrack does NOT handle actual trust accounting (that is the domain of Clio, QuickBooks, or dedicated trust software) — but it surfaces the information lawyers need to avoid IOLTA violations. Mishandling trust funds is the #1 cause of attorney discipline; awareness features help lawyers stay compliant.

### Calendar Integration
Sync with Microsoft 365/Outlook and Google Workspace calendars. Auto-create draft time entries from calendar events (meetings, calls, court dates). Cross-reference calendar data with window activity to generate richer narratives ("Participated in one-hour video conference with opposing counsel re: discovery deadlines, as reflected in calendar and confirmed by Zoom activity").

### Premium Tier & Licensing
Introduce a freemium model calibrated for legal professionals:
- **Free**: All core tracking features, 5 AI narrative generations/day, 3 active matters, 7-day retention, basic rate table
- **Solo** ($49/user/month): Unlimited AI narratives, unlimited matters, retroactive entry generation, UTBMS codes, billing analytics, pre-bill workflow, 365-day retention
- **Firm** ($79/user/month): Everything in Solo plus Clio integration, LEDES export, trust accounting awareness, calendar integration, priority support

At $349/hr average billing rate, Solo pays for itself if it captures just 8.5 additional minutes per month. In practice, lawyers recover 1+ hour per day — the ROI is 50-100x.

### Referral Program
See dedicated section below.

### Infrastructure: Auto-Updates
Auto-update via Sparkle framework. Signed updates with Ed25519. Delta updates to minimize download size. Critical for law firms where IT support is minimal and lawyers need the tool to stay current without manual intervention.

---

## Phase 4 — Team (Q1-Q2 2027)

*Theme: Expand from solo practitioner to small firm. Privacy-preserving collaboration for firms with 2-10 attorneys.*

### Multi-Timekeeper Support
Each attorney at the firm runs TimeTrack locally with full privilege protection. Shared client/matter definitions sync across the firm. Each timekeeper has their own rate schedule. Timekeepers see only their own entries unless granted reviewer access.

### Firm-Level Reporting
Aggregated reports across all timekeepers:
- **Firm utilization**: total billable hours across the practice
- **Matter profitability**: hours and revenue by matter, with cost analysis
- **Timekeeper productivity**: comparative billable hour reports (with appropriate access controls)
- **Client billing summaries**: consolidated view across all timekeepers working on a client
- **Practice area analysis**: time distribution across practice areas

No raw data or screenshots ever leave the individual device. Reports aggregate only approved time entries.

### Approval Workflows
Partners or billing attorneys can review submitted time entries before finalization. Comment and request narrative changes. Approval status tracking (draft > submitted > approved > rejected > invoiced). Batch approval for efficiency. Designed for firms where a partner reviews associate billing before client invoices are sent.

### Workload Distribution
Firm-level analytics: capacity planning based on billable hour targets, workload distribution across attorneys, matter staffing analysis, and burnout risk indicators based on hours tracked. Designed to help managing partners allocate work effectively — not to surveil attorneys.

### Infrastructure: Encrypted Firm Sync
End-to-end encrypted sync for firm-level features. Zero-knowledge architecture — the sync server never sees decrypted client data. Self-host option for firms requiring complete data control. All client names, matter details, and billing narratives are encrypted before leaving the device.

---

## Phase 5 — Platform (Q3-Q4 2027)

*Theme: Become the billing intelligence platform for the legal profession.*

### Additional Practice Management Integrations
- **MyCase**: second-largest PMS for small firms; sync matters and time entries
- **PracticePanther**: popular with solo and small firms; full two-way sync
- **Rocket Matter**: strong in litigation firms; matter and billing sync
- **QuickBooks Online**: most common accounting software for small firms; invoice and payment sync for collection rate tracking

### Advanced AI Features
- **Weekly billing summaries**: "Here's your week — 38.2 billable hours across 12 matters, $13,330 in projected billings"
- **Client meeting prep**: "Before your 2pm with Client X, here's your recent work: 14.3 hours across 3 matters this month"
- **Narrative optimization**: AI reviews narratives for billing compliance issues (vague language, block billing, missing specificity) and suggests improvements
- **Natural language time queries**: "How much time did I spend on the Johnson matter last month?" answered instantly from local data
- **Fee petition support**: generate detailed fee petition documentation from time entry data, formatted for court submission

### Menu Bar Companion
Native macOS menu bar widget. Shows tracking state with elapsed time, displays today's total billable hours and billable value, quick matter selection for active tracking, provides start/stop without opening the browser, and includes a "Open Dashboard" action. Especially useful for lawyers who need to glance at their billable total throughout the day.

### Infrastructure: SOC 2 Preparation
Formal security audit. Document data handling practices for attorney-client privilege compliance. Penetration testing. Prepare for SOC 2 Type I certification — increasingly required by mid-size and large firms evaluating software vendors. Publish a detailed security whitepaper addressing ABA cloud computing ethics opinions.

---

## Phase 6 — Scale (2028+)

*Theme: Enterprise law firm readiness and market expansion.*

### Windows Support
Many law firms are Windows-based environments. Port the tracking engine to Windows using native Win32 APIs for window tracking and screenshot capture. Maintain the same privilege-first, on-device architecture. Evaluate Tauri for a cross-platform desktop shell. This unlocks the majority of the legal market that runs on Windows.

### Enterprise Law Firm Features
SSO/SAML integration for firms with 50+ attorneys. Admin console for firm-wide settings, rate tables, and billing policies. Audit logging for compliance. Role-based access control (managing partner, partner, associate, paralegal, billing coordinator). Custom data retention policies per firm. Multi-office support.

### Self-Hosted Deployment
Docker-based self-hosted option for firms requiring complete data residency. Helm charts for Kubernetes. Air-gapped installation support for firms handling classified or highly sensitive matters (government contracts, national security). Enterprise support tier with dedicated account management.

### Mobile Companion
iOS app for reviewing time entries and billable totals on the go. Push notifications for daily billing summaries. Quick manual time entry for activities away from the computer (court appearances, client lunches, depositions). Read-only sync from the desktop app. Designed for lawyers who need to check their numbers between meetings.

### Advanced Compliance
Integration with e-billing platforms (Legal Tracker, Collaborati, Tymetrix). Automated billing guideline compliance checking (flag entries that violate client-specific outside counsel guidelines). Support for alternative fee arrangements (AFAs): flat fees, blended rates, capped fees, success fees. International billing support (multi-currency, VAT).

---

## Referral Program

### Overview
The TimeTrack Referral Program launches alongside the premium tiers in Phase 3. Designed to grow organically through the professional networks that define the legal industry — bar associations, practice groups, referral networks, and the informal "what software do you use?" conversations between attorneys.

### How It Works
Every TimeTrack user (free or premium) gets a unique referral link from the Settings page. When a colleague installs TimeTrack using that link and completes their first tracked session, both parties receive rewards.

### Reward Tiers

| Milestone | Referrer Reward | New User Reward |
|-----------|----------------|-----------------|
| 1st referral | 1 free month of Solo tier | 1 free month of Solo tier (extended trial) |
| 3 referrals | 1 additional free month | — |
| 5 referrals | Lifetime unlock: Billing Analytics | — |
| 10 referrals | 3 additional free months (5 total earned) | — |
| 25 referrals | **Lifetime Solo access** (Advocate status) | — |

### New User Incentive
Every referred attorney receives a **1-month Solo trial** (instead of the standard 14-day trial). Enough time to experience retroactive entry generation, billing analytics, and the pre-bill workflow — the features that recover thousands in lost billable time and are most likely to convert.

### Advocate Program
Users who reach 25 referrals earn **Advocate** status:
- Lifetime Solo access
- Advocate badge in profile
- Early access to beta features
- Direct feedback channel to the product team
- Invitation to the TimeTrack Legal Advisory Board

Advocates are TimeTrack's most trusted voices in the legal community. Their input shapes the product roadmap.

### Bar Association Partnerships
TimeTrack pursues partnerships with state and local bar associations:
- **CLE credit tie-ins**: co-sponsor CLE programs on legal technology and billing efficiency
- **Member discount**: bar association members receive 15% off annual subscriptions
- **Practice management advisor endorsements**: work with bar PM advisors who recommend tools to members
- **Conference presence**: sponsor legal technology conferences (ABA TECHSHOW, ILTACON, state bar annual meetings)

### Implementation Details
- **Referral link**: `timetrack.app/r/{short-code}` — clean, shareable, professional
- **Tracking**: Attribution stored locally on the new user's device at install time. Validated on first premium activation or trial start. No tracking pixels or third-party analytics — consistent with privilege-first positioning
- **Reward delivery**: Free months applied automatically as license extensions. Feature unlocks activated immediately. No manual claiming required
- **Fraud prevention**: One reward per unique device. Referral only counts after the referred user completes at least one tracked session. Self-referral detection via device and API key matching
- **Dashboard**: Referral section in Settings showing total referrals, pending activations, earned rewards, and a shareable link with copy button

### Suggested Share Moments
The app surfaces referral prompts at natural moments:
- After recovering significant unbilled time: *"You just recovered 2.3 hours of billable time. Know a colleague who'd benefit?"*
- After a billing milestone: *"You tracked $12,400 in billable time this month — share TimeTrack with your network."*
- After generating a LEDES export or Clio sync: *"Billing complete. Know an attorney who still reconstructs time from memory?"*
- In the weekly billing summary notification (Phase 5)

### Premium Feature Comparison

| Feature | Free | Solo ($49/mo) | Firm ($79/mo) |
|---------|------|---------------|---------------|
| Session tracking | Unlimited | Unlimited | Unlimited |
| AI billing narratives | 5/day | Unlimited | Unlimited |
| Active matters | 3 | Unlimited | Unlimited |
| Legal categories | 6 default | 6 + custom | 6 + custom |
| Billing increments | 0.1hr | 0.1hr (configurable) | 0.1hr (configurable) |
| Rate tables | Default rate only | Per-client & per-matter | Per-client, per-matter, per-timekeeper |
| Retroactive entries | — | Yes | Yes |
| UTBMS codes | — | Yes | Yes |
| Billing analytics | 7-day view | Full history + KPIs | Full history + KPIs + firm rollup |
| Pre-bill workflow | — | Yes | Yes |
| Clio integration | — | — | Yes |
| LEDES export | — | — | Yes |
| Calendar integration | — | — | Yes |
| Trust accounting awareness | — | — | Yes |
| Data retention | 7 days | 365 days | 365 days |
| Multi-timekeeper | — | — | Yes |
| Firm reporting | — | — | Yes |

---

## What's Already Shipped (MVP)

These features are live today and form the foundation of TimeTrack's privilege-first architecture:

- [x] Start/stop session tracking with live timer
- [x] Window activity logging (active app + window title, every 3s) — captures the raw data needed to reconstruct billable work
- [x] Screenshot capture (every 30s, secure temp directory) — provides visual context for AI narrative generation, then immediately destroyed
- [x] AI summarization via Claude (summaries, categories, per-activity narratives) — the engine that generates billing-quality narratives
- [x] Category-based time classification with color-coded visualization
- [x] SQLite local database with auto-pruning — all data stays on the lawyer's device
- [x] REST API + WebSocket real-time updates
- [x] Session table with expandable rows, category bars, category pills
- [x] Day navigation for browsing session history
- [x] Light/dark theme
- [x] macOS permission detection + onboarding
- [x] **Privacy-first architecture: all data local, no telemetry, screenshots deleted after summarization** — the foundation of privilege compliance
- [x] **On-device AI processing** — window titles and screenshots containing privileged client information are sent only to the Anthropic API via encrypted connection, never stored on third-party servers, and never used for model training
- [x] Local auth token for API security

---

## The Privilege Advantage

TimeTrack's on-device architecture is not just a feature — it is an ethical compliance requirement for lawyers.

**The problem**: ABA Model Rule 1.6 requires lawyers to make "reasonable efforts" to prevent unauthorized disclosure of client information. Window titles routinely contain client names, case details, and privileged communications. Screenshots capture confidential documents, strategy notes, and attorney work product. Cloud-based AI time trackers that transmit this data to remote servers create a potential waiver of attorney-client privilege — a risk no responsible lawyer should accept.

**Our approach**: TimeTrack processes all data locally. Window logs and screenshots never leave the device except for the encrypted API call to Claude for summarization, after which they are permanently destroyed. The summarized billing narratives — which contain no raw client data — are the only persistent output. Over 30 states have issued ethics opinions on cloud computing for lawyers, and TimeTrack's architecture satisfies the most conservative interpretations.

**Positioning**: "The only AI time tracker built for attorney-client privilege."

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| [x] | Shipped |
| Planned | Committed to roadmap |
| Exploring | Under consideration |

---

*This roadmap is a living document. Priorities shift based on attorney feedback, bar association guidance, and market conditions. Last updated: March 2026.*
