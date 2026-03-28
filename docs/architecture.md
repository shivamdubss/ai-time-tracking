# Donna — System Architecture

## High-Level Overview

```mermaid
graph TB
    subgraph Desktop["Desktop Application"]
        subgraph Electron["Electron Shell"]
            Main["main.ts<br/>App lifecycle, window"]
            Tray["tray.ts<br/>System tray menu"]
            Sidecar["sidecar.ts<br/>Backend process manager"]
        end

        subgraph Frontend["React Frontend"]
            App["App.tsx<br/>Router + Auth provider"]
            Timeline["TimelinePage<br/>Live tracking view"]
            Timesheet["TimesheetPage<br/>Weekly timesheet"]
            Analytics["AnalyticsPage<br/>Reports & charts"]
            Clients["ClientsMattersPage<br/>Client & matter mgmt"]
            Settings["SettingsPage<br/>Preferences"]
        end

        subgraph Backend["Python FastAPI Backend (sidecar)"]
            API["main.py<br/>REST API + WebSocket"]
            DB["database.py<br/>SQLite (offline-first)"]
            Tracker["tracker/<br/>Session, window, screenshot"]
            Summarizer["summarizer.py<br/>Claude AI integration"]
            Sync["sync.py<br/>Bidirectional sync engine"]
            Matcher["matter_matcher.py<br/>Activity → matter mapping"]
        end
    end

    subgraph Cloud["Cloud Services (optional)"]
        Supabase["Supabase<br/>Auth + PostgreSQL + Edge Functions"]
        EdgeFn["Edge Function: /summarize<br/>(Deno runtime)"]
        Anthropic["Anthropic Claude API<br/>Session summarization"]
    end

    subgraph Distribution["Build & Distribution"]
        GHA["GitHub Actions<br/>CI/CD on v* tags"]
        GHR["GitHub Releases<br/>DonnaSetup.exe, Donna.dmg"]
        Vercel["Vercel<br/>Landing page"]
    end

    Main -->|spawns| Sidecar
    Sidecar -->|starts on localhost:port| API
    Main -->|loads http://127.0.0.1:port| App
    Tray -->|show/quit| Main

    App -->|HTTP /api/*| API
    App -->|WebSocket /ws| API
    App -->|Auth| Supabase

    API --> DB
    API --> Tracker
    API --> Summarizer
    Sync -->|push/pull| Supabase
    Summarizer -->|POST| EdgeFn
    EdgeFn -->|Claude API| Anthropic

    GHA -->|builds| GHR
```

## Data Flow: Time Tracking Session

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant SM as SessionManager
    participant WT as WindowTracker
    participant SC as ScreenshotCapture
    participant SD as SleepDetector
    participant AI as Claude API
    participant DB as SQLite
    participant SY as SyncEngine
    participant SB as Supabase

    U->>FE: Click "Start Tracking"
    FE->>BE: POST /api/sessions/start
    BE->>SM: start()
    SM->>DB: INSERT session (status=active)
    SM->>WT: start polling (every 3s)
    SM->>SC: start capturing (every 30s)
    SM->>SD: start monitoring

    loop Every 3 seconds
        WT->>WT: Capture active window (app + title)
    end

    loop Every 30 seconds
        SC->>SC: Screenshot → JPEG in temp dir
    end

    Note over SD: Detects sleep/wake, idle > 300s

    U->>FE: Click "Stop Tracking"
    FE->>BE: POST /api/sessions/stop
    BE->>SM: stop()
    SM->>SM: Collect window_entries + screenshots

    BE->>BE: build_timeline(window_entries)
    BE->>BE: select_screenshots(max=20)
    BE->>BE: _build_matters_context()
    BE->>AI: Send timeline + images + matters context
    AI-->>BE: {summary, categories, activities[]}

    BE->>BE: match_activities_to_matters()
    Note over BE: Keyword matching: activity context<br/>vs matter keywords. Longest match wins.

    BE->>DB: INSERT activities (with matter_id, rate, billing)
    BE->>DB: UPDATE session (status=completed)
    BE-->>FE: WebSocket: session_completed

    opt Cloud sync enabled
        SY->>DB: Query changed rows (updated_at > synced_at)
        SY->>SB: Upsert changed rows
        SY->>SB: Pull remote changes
        SY->>DB: Merge remote → local
    end
```

## Build & Deploy Pipeline

```mermaid
flowchart LR
    subgraph Source["Source Code"]
        FE_SRC["frontend/src/**<br/>React + TypeScript"]
        BE_SRC["backend/**<br/>Python + FastAPI"]
        EL_SRC["electron/src/**<br/>TypeScript"]
        LP_SRC["landing/**<br/>HTML/CSS/JS"]
    end

    subgraph Build["Build Steps"]
        Vite["Vite<br/>npm run build"]
        PyInst["PyInstaller<br/>donna-mac.spec / donna-win.spec"]
        EBuild["electron-builder<br/>npm run build:mac / build:win"]
    end

    subgraph Artifacts["Output Artifacts"]
        FE_DIST["frontend/dist/<br/>Static HTML/CSS/JS"]
        BE_DIST["dist-backend/<br/>DonnaBackend executable"]
        EL_DIST["dist-electron/<br/>DonnaSetup.exe / Donna.dmg"]
    end

    subgraph Deploy["Deployment"]
        GHA["GitHub Actions<br/>Triggered by v* tag"]
        GHR["GitHub Releases<br/>Windows + macOS binaries"]
        VCL["Vercel<br/>vercel --prod"]
    end

    FE_SRC --> Vite --> FE_DIST
    BE_SRC --> PyInst --> BE_DIST
    FE_DIST -.->|bundled into| BE_DIST
    BE_DIST -.->|extraResources| EBuild
    EL_SRC --> EBuild --> EL_DIST

    EL_DIST --> GHA --> GHR
    LP_SRC --> VCL

    style FE_DIST fill:#e8f5e9
    style BE_DIST fill:#e3f2fd
    style EL_DIST fill:#fff3e0
```

## Component Map

| Layer | Technology | Key Files | Purpose |
|-------|-----------|-----------|---------|
| **Electron Shell** | Electron 31, TypeScript | `electron/src/main.ts`, `sidecar.ts`, `tray.ts` | Desktop container, process management, system tray |
| **Frontend** | React 19, Vite, Tailwind CSS | `frontend/src/App.tsx`, `lib/api.ts`, `hooks/useAuth.tsx` | UI: timeline, timesheet, analytics, client/matter management |
| **Backend** | Python, FastAPI, Uvicorn | `backend/main.py`, `database.py`, `auth.py` | REST API, WebSocket, auth, business logic |
| **Tracking** | psutil, mss, platform APIs | `backend/tracker/session_manager.py`, `window_tracker.py`, `screenshot.py` | Window monitoring, screenshots, idle/sleep detection |
| **AI** | Anthropic Claude | `backend/summarizer.py`, `supabase/functions/summarize/index.ts` | Session summarization, activity classification, UTBMS codes |
| **Storage** | SQLite (local), PostgreSQL (cloud) | `backend/database.py`, `backend/sync.py` | Offline-first with optional cloud sync |
| **Cloud** | Supabase | `supabase/migrations/`, `supabase/functions/` | Auth, database, edge functions |
| **CI/CD** | GitHub Actions, electron-builder | `.github/workflows/build-desktop.yml` | Tag-triggered multi-platform builds + GitHub Releases |
| **Landing** | HTML/CSS/JS, Vercel | `landing/` | Marketing site with download links |

## External Services

```mermaid
graph LR
    App["Donna Desktop App"]

    App -->|"Auth (OAuth, email/password)"| Supabase["Supabase<br/>Auth + PostgreSQL"]
    App -->|"Sync (REST, bidirectional)"| Supabase
    App -->|"POST /functions/v1/summarize"| Edge["Supabase Edge Function"]
    Edge -->|"Claude API (sonnet)"| Anthropic["Anthropic API"]
    App -.->|"Direct call (dev mode)"| Anthropic

    GH["GitHub Actions"] -->|"Build artifacts"| Releases["GitHub Releases"]

    style Supabase fill:#3ecf8e,color:#fff
    style Anthropic fill:#d97706,color:#fff
    style Releases fill:#24292f,color:#fff
```

## Database Schema

```mermaid
erDiagram
    clients ||--o{ matters : "has"
    matters ||--o{ activities : "assigned to"
    sessions ||--o{ activities : "contains"

    clients {
        text id PK
        text user_id
        text name
        text contact_info
        real default_rate
        text status
        timestamp updated_at
        timestamp synced_at
    }

    matters {
        text id PK
        text client_id FK
        text user_id
        text name
        text matter_number
        text practice_area
        text billing_type
        real hourly_rate
        json keywords
        text status
        timestamp updated_at
        timestamp synced_at
    }

    sessions {
        text id PK
        text user_id
        text status
        timestamp start_time
        timestamp end_time
        integer elapsed_seconds
        text summary
        json categories
        json activities
        text matter_id FK
        timestamp updated_at
        timestamp synced_at
    }

    activities {
        text id PK
        text session_id FK
        text matter_id FK
        text user_id
        text app
        text context
        integer minutes
        text narrative
        text category
        boolean billable
        real effective_rate
        text activity_code
        timestamp start_time
        timestamp end_time
        text approval_status
        timestamp updated_at
        timestamp synced_at
    }
```
