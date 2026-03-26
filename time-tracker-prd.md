# Product Requirements Document
## Automatic Time Tracking App for macOS

**MVP Scope | March 2026 | Mesh Solutions Inc.**

---

## 1. Overview

This document defines the MVP requirements for an automatic time tracking application for macOS. The app consists of two parts: a lightweight background service that captures desktop activity (window tracking + periodic screenshots), and a local web-based dashboard where users start/stop sessions, view AI-generated summaries, and browse session history. All raw capture data is destroyed immediately after summarization to preserve privacy.

## 2. Problem Statement

Manual time tracking is tedious and inaccurate. People forget to log what they worked on, and reconstructing a day from memory leads to vague entries like "worked on project" or "meetings." Existing tools either require constant manual input or capture too much data without respecting privacy. There is a need for a lightweight tool that passively observes what you are doing, summarizes it intelligently, and then destroys the evidence.

## 3. Target User

The initial user is a solo founder, indie developer, or freelancer working on a Mac who wants an honest accounting of where their time goes without the overhead of manual logging. They care about privacy and do not want screenshots or recordings persisted on disk or transmitted anywhere beyond what is needed for summarization.

## 4. Product Goals

| Goal | Success Metric |
|------|----------------|
| One-click start/stop time tracking | User can begin and end a session from the web dashboard in under 2 seconds |
| Passive activity monitoring | App captures active window titles + periodic screenshots without user intervention |
| AI-powered plain-language summary | Session summary accurately reflects activities in natural, readable language |
| Privacy-first design | All raw screenshots are deleted within 60 seconds of session end; no data leaves the device except API calls to Claude |
| 7-day session history | Users can review past session summaries within the dashboard for the last 7 days |

## 5. Core User Flow

1. User opens the TimeTrack dashboard in their browser (localhost) or via a menu bar shortcut.
2. User clicks the "Start Tracking" button. The button changes to "Stop Tracking" and a live elapsed timer appears in the header.
3. In the background, the app begins logging the active window's application name and title every 3 seconds, and captures a screenshot of the active window every 30 seconds. Screenshots are stored in a temporary directory with restrictive file permissions.
4. User continues working normally. The tracking service is invisible and non-intrusive.
5. When done, the user returns to the dashboard and clicks "Stop Tracking."
6. The app bundles the window log and screenshots, sends them to the Claude API for analysis, and receives a structured summary. A processing state is shown in the UI.
7. All screenshots are permanently deleted from disk. The window activity log is also deleted. Only the generated summary and session metadata (start time, end time, duration) are retained.
8. The new session appears in the dashboard table with its summary, categorized time breakdown, and per-activity narrative. The user can expand the session row to see individual activities.

## 6. Functional Requirements

### 6.1 Web Dashboard UI

The dashboard is a locally-served web application that presents session data in a table-based layout inspired by professional timekeeping tools. The UI has the following structure:

**Sidebar (left):** App branding ("TimeTrack"), navigation links (Sessions, Analytics, Rules, Settings), and user identity at the bottom.

**Header bar:** Contains the Automatic Capture toggle, a day navigation control (forward/back through days), and the Start/Stop Tracking button with a live elapsed timer visible during active sessions.

**Main content area (Sessions view):** A three-column table layout:

| Column | Content |
|--------|---------|
| Activity | Session time range (e.g., "9:02 AM - 12:34 PM"), activity count, a color-coded category bar showing time distribution, and category pills (e.g., "Coding 46%", "Communication 25%") |
| Hours | Total session hours in monospace font (e.g., "3.5") |
| Narrative | AI-generated plain-language summary of the session |

Each session row is expandable. When expanded, it reveals individual activity rows underneath with the same three-column structure: app name + context (e.g., "VS Code - mesh-platform / src"), hours spent, and a per-activity narrative describing what was done.

**Footer:** Shows total session count and total hours for the selected day.

**UI States:**
- Idle: Default view showing past sessions for the selected day.
- Tracking: "Stop Tracking" button is red with a live timer. The active session does not yet appear in the table.
- Processing: After stopping, a loading/spinner state while Claude generates the summary.
- Empty: "No sessions recorded for this day" message for days with no data.

**Reference mockup:** See the accompanying `time-tracker-ui.jsx` artifact for a working React prototype of this layout.

### 6.2 Menu Bar Companion (Optional)

A lightweight menu bar icon can serve as a companion to the web dashboard:

- Shows tracking state (idle vs. active with elapsed time).
- Provides Start/Stop Tracking without needing to open the browser.
- "Open Dashboard" menu item launches the web UI.
- This is a nice-to-have for MVP and can be added after the core web dashboard is functional.

### 6.3 Activity Tracking Engine

The tracking engine runs two parallel collectors:

**Window Tracker:** Polls the active (frontmost) window every 3 seconds via macOS accessibility APIs. Logs: timestamp, application name (e.g., "Google Chrome"), window title (e.g., "Jira - Sprint Board"). Stores entries in an in-memory list, flushed to a temporary JSON file periodically.

**Screenshot Capture:** Captures the active window (not the full screen) every 30 seconds using macOS screen capture APIs. Images are saved to a secure temporary directory (e.g., `/tmp/timetrack-XXXXX/`) with `0600` permissions. File format: JPEG at 60% quality to minimize disk usage. Each image is timestamped and correlated with the window log.

### 6.4 Session Summarization

When the user stops tracking, the app performs the following:

1. Assembles the window activity log into a chronological timeline.
2. Selects a representative subset of screenshots (e.g., one per unique window/context switch, or every Nth image if the session is long) to stay within API token limits.
3. Sends the timeline and selected screenshots to the Claude API (`claude-sonnet-4-20250514`) with a structured prompt requesting: a high-level summary, a categorized breakdown by activity type, a list of specific activities with approximate durations and per-activity narratives, and any notable context from screenshot content.
4. Parses the structured response, stores it as the session summary, and pushes it to the web dashboard via a WebSocket or polling update.

### 6.5 Data Lifecycle and Privacy

| Data Type | Storage Location | Retention | Destruction Method |
|-----------|-----------------|-----------|-------------------|
| Screenshots | Secure temp dir (`/tmp/`) | Session duration only | Immediate deletion + overwrite after summarization |
| Window activity log | In-memory + temp JSON | Session duration only | Deleted after summarization |
| Session summary | Local SQLite database | 7 days (rolling) | Auto-pruned on app launch |
| Session metadata | Local SQLite database | 7 days (rolling) | Auto-pruned with summary |
| API request payload | Transient (in-memory) | Duration of API call | Garbage collected; not persisted |

Additional privacy constraints:

- No telemetry, analytics, or crash reporting that transmits user data.
- API calls to Claude use HTTPS. No other network calls are made.
- The app never reads clipboard contents, keystrokes, or microphone/camera input.
- Screenshots are never transmitted to any service other than the Anthropic API for summarization.
- The web dashboard is served on localhost only and is not accessible from other devices on the network.

### 6.6 Session History

- Summaries and metadata are stored in a local SQLite database in the app's Application Support directory.
- The dashboard shows sessions grouped by day, navigable with forward/back controls.
- Each session displays: time range, duration, activity count, category breakdown bar, and the AI summary.
- Expanding a session reveals the full per-activity breakdown.
- Sessions older than 7 days are auto-deleted on app launch.
- User can manually delete any session from the dashboard.

## 7. Technical Architecture

### 7.1 Recommended Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend runtime | Python 3.11+ | Fast to ship; rich macOS integration libraries |
| Web framework | FastAPI | Lightweight async web server; serves dashboard and exposes API for session data |
| Frontend | React (Vite) | Component-based UI; easy to iterate on the dashboard; runs on localhost |
| Window tracking | pyobjc (NSWorkspace, CGWindow) | Direct access to macOS window management APIs |
| Screenshot capture | pyobjc (CGWindowListCreateImage) | Native window-level capture without full screen |
| Real-time updates | WebSocket (FastAPI) | Push session state and new summaries to the dashboard without page refresh |
| Local database | SQLite via sqlite3 | Zero-config, file-based, built into Python |
| AI summarization | Anthropic Python SDK | Direct Claude API access with vision support |
| Menu bar (optional) | rumps | Lightweight companion for start/stop without opening the browser |
| Packaging | py2app or PyInstaller | Bundle backend + frontend into a native .app for distribution |

### 7.2 System Architecture

The app runs as a Python backend process that serves the React frontend and manages all tracking logic:

**FastAPI Server:** Serves the React dashboard on `localhost:PORT`. Exposes REST endpoints for starting/stopping sessions, fetching session history, and deleting sessions. Maintains a WebSocket connection to push live tracking state (elapsed time, processing status) to the frontend.

**Activity Tracker (thread):** Runs on a background thread when a session is active. Polls the frontmost window via NSWorkspace and CGWindow APIs every 3 seconds. Captures screenshots every 30 seconds using CGWindowListCreateImage.

**Summarizer:** Invoked on session end. Assembles the payload, calls the Claude API, parses the response, stores the summary, and notifies the frontend via WebSocket.

**Data Manager:** Handles SQLite operations, temp file management, and the 7-day retention policy.

### 7.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/start` | Begin a new tracking session |
| POST | `/api/sessions/stop` | End the active session and trigger summarization |
| GET | `/api/sessions` | List sessions, filterable by date range |
| GET | `/api/sessions/:id` | Get full session detail including activities |
| DELETE | `/api/sessions/:id` | Delete a session and its summary |
| GET | `/api/status` | Current tracking state (idle/tracking/processing) and elapsed time |
| WS | `/ws` | WebSocket for real-time state updates to the dashboard |

### 7.4 Claude API Integration

The summarization prompt should instruct Claude to return a structured JSON response with the following shape:

```json
{
  "summary": "High-level 1-2 sentence overview of the session.",
  "categories": [
    { "name": "Coding", "minutes": 45, "percentage": 38, "color": "#3B82F6" },
    { "name": "Communication", "minutes": 30, "percentage": 25, "color": "#8B5CF6" }
  ],
  "activities": [
    {
      "app": "VS Code",
      "context": "mesh-platform / src",
      "minutes": 40,
      "narrative": "Built maintenance workflow orchestration module and tenant communication service."
    },
    {
      "app": "Google Chrome",
      "context": "github.com",
      "minutes": 18,
      "narrative": "Reviewed open PRs on OpenClaw repo; merged calendar integration branch."
    }
  ]
}
```

Screenshots are sent as base64-encoded images in the API request using Claude's vision capability. To manage token usage, the app should send a maximum of 20 screenshots per session, selecting them to maximize coverage of distinct activities.

## 8. macOS Permissions Required

| Permission | Why Needed | User Prompt |
|------------|-----------|-------------|
| Accessibility | Read window titles and frontmost app via Accessibility API | System Preferences > Privacy > Accessibility |
| Screen Recording | Capture screenshots of active windows | System Preferences > Privacy > Screen Recording |

The app should detect missing permissions on launch and guide the user through enabling them with clear instructions in the web dashboard.

## 9. MVP Scope and Boundaries

### 9.1 In Scope (MVP)

- Local web dashboard with session table (Activity / Hours / Narrative columns)
- Start/Stop tracking from the dashboard with live elapsed timer
- Day navigation to browse session history
- Expandable session rows showing per-activity breakdowns
- Category color bars and percentage pills per session
- Window title + app name logging (3-second interval)
- Active window screenshot capture (30-second interval)
- Claude-powered session summarization with categorized breakdown and per-activity narratives
- 7-day rolling session history stored locally in SQLite
- Automatic destruction of all raw capture data post-summarization
- Basic permission detection and guidance

### 9.2 Out of Scope (Post-MVP)

- Menu bar companion (nice-to-have, add after core dashboard works)
- Multi-monitor support (MVP tracks primary/active window only)
- Analytics view (aggregate stats across sessions/days/weeks)
- Calendar integration to correlate meetings with time blocks
- Export to CSV, Toggl, Harvest, or other time tracking tools
- Customizable capture intervals or categorization rules
- Project/tag assignment to sessions
- Cloud sync or multi-device history
- Idle detection (pausing tracking when user is away)
- Pomodoro or timer-based session modes
- End-to-end encryption of the local database

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| macOS permissions friction | High - Users may not grant Accessibility/Screen Recording access | Clear onboarding flow with step-by-step permission setup in the dashboard |
| API cost for long sessions | Medium - Sending many screenshots increases token usage | Cap at 20 screenshots per session; use JPEG compression; select representative samples |
| Sensitive content in screenshots | High - Screenshots may contain passwords, private messages, etc. | Screenshots never leave the device except via encrypted API call; destroyed immediately after |
| Window titles expose private data | Medium - Titles like "salary_negotiation.docx" reveal intent | Window log is destroyed after summarization; summary uses general language |
| App crash during session | Medium - Raw data could persist on disk | Cleanup routine on app launch that wipes any leftover temp directories |
| localhost security | Low - Another app on the same machine could access the dashboard | Bind to 127.0.0.1 only; consider adding a local auth token for API endpoints |

## 11. Development Phases

Suggested build order to get to a working MVP incrementally:

### Phase 1: Skeleton (Day 1)

- Set up Python project with FastAPI backend
- Scaffold React frontend with Vite (sidebar, header, empty table)
- Implement `/api/status` and `/api/sessions/start` / `/api/sessions/stop` endpoints
- Wire up Start/Stop button and elapsed timer via WebSocket

### Phase 2: Activity Tracking (Days 2-3)

- Implement window title polling via pyobjc
- Implement screenshot capture via CGWindowListCreateImage
- Temp directory management with secure permissions
- Background thread orchestration tied to start/stop API calls

### Phase 3: Summarization (Days 3-4)

- Claude API integration with vision
- Prompt engineering for structured summary output (including per-activity narratives)
- Response parsing and summary storage in SQLite
- Raw data cleanup pipeline
- Push completed summary to frontend via WebSocket

### Phase 4: Dashboard Polish (Days 4-6)

- Session table with expandable rows and per-activity detail
- Category color bars and percentage pills
- Day navigation (forward/back)
- Session history with 7-day auto-pruning
- Permission detection and onboarding screen
- Error handling and crash recovery cleanup
- Empty states and loading/processing states

### Phase 5: Menu Bar Companion (Day 7, Optional)

- Add rumps-based menu bar icon showing tracking state
- Start/Stop from menu bar
- "Open Dashboard" menu item

## 12. UI Reference

The accompanying `time-tracker-ui.jsx` file contains a working React prototype of the dashboard layout. Key design decisions reflected in the mockup:

- **Three-column table:** Activity (with category bar), Hours (monospace), Narrative. Mirrors the structure of professional timekeeping tools.
- **Expandable rows:** Session rows expand to show individual activities with app icon, context, hours, and narrative.
- **Category visualization:** Each session shows a stacked color bar and labeled pills for time distribution across categories (Coding, Communication, Research, Meetings, Browsing).
- **Header controls:** Automatic Capture toggle, day navigation, and a prominent Start/Stop Tracking button with live timer.
- **Sidebar:** Minimal navigation for Sessions, Analytics, Rules, and Settings views.
- **Typography:** DM Sans for UI text, JetBrains Mono for numeric values (hours, timer).

## 13. Open Questions

- Should idle detection (no mouse/keyboard input for N minutes) be added to MVP, or deferred? Currently deferred.
- Should the user be able to add a manual note or tag to a session before stopping? Could be useful but adds UI complexity.
- What is the right screenshot interval? 30 seconds is a starting point, but may need tuning based on API costs and summary quality.
- Should the app offer a "preview" of the summary before destroying raw data, in case the user wants to re-run?
- Should the dashboard support editing narratives after generation (e.g., fixing inaccuracies in the AI summary)?
- Packaging: bundle backend + frontend into a single .app, or run as a CLI that opens the browser?
