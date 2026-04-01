# Calendar & Email Integration Plan

## Context

The current docketing workflow requires a paralegal (Sheena) to manually cross-reference Shivani's Outlook inbox/sent items and Google Calendar to reconstruct billable time entries — matching emails and calendar events to clients, matters, and time blocks. This integration automates that process by pulling data from both sources directly into the app.

**Key assumption:** Shivani's email is hosted on Microsoft 365. This unlocks the Microsoft Graph API, which covers both mail and Outlook Calendar from a single OAuth session. Shivani uses both Google Calendar and Outlook — both integrations are in scope.

---

## How It Works

### Google Calendar

Shivani already logs court sessions and document prep blocks in Google Calendar with descriptive titles (e.g., "Hearing - Smith v. Jones"). The integration pulls those directly.

**Flow:**
1. User connects Google account via OAuth (one-time, browser-based)
2. User selects a date range to import
3. App fetches all calendar events from the Google Calendar API
4. Claude maps each event title + description → matter match, category, billable duration (exact, from event start/end times)
5. Review screen shows all proposed entries — user confirms, edits, or rejects each
6. Confirmed entries saved as activities and synced to Supabase

**Key advantage:** Duration is exact. No estimation — the calendar event start/end time becomes the time entry.

---

### Microsoft 365 (Mail + Outlook Calendar)

The Graph API provides a single authenticated client for both mail and calendar. Fetches sent items and inbox for a date range, then Claude parses each email to identify the matter, category, and an estimated duration.

**Flow:**
1. User connects M365 account via OAuth (one-time Azure AD consent, browser-based)
2. User selects a date range to import
3. App fetches sent items + inbox via `/me/mailFolders/SentItems/messages` and `/me/mailFolders/Inbox/messages`
4. Claude reads subject + body snippet → matter match, category (usually "Client Communication"), estimated duration
5. Court portal filings identified by send timestamps on sent items
6. Email threads de-duplicated (RE: chains counted as one entry, not N)
7. Same review screen → confirm → save

**Key limitation:** Email duration is always an estimate. Claude assigns a standard time block (e.g., 15 min for a short reply, 30 min for a substantive email). This is the trade-off vs. calendar events.

---

## Triangulating Between Sources

Having both Google Calendar and M365 mail available simultaneously lets Claude do something more valuable than treating each source in isolation: it can build a **unified timeline of the day** and use each source to validate and fill in the other.

**How it works:**

1. **Calendar events anchor the timeline.** A calendar entry "Prep for Thompson Deposition, 1pm–3pm" creates a confirmed 2-hour block with an exact matter and category. This is the ground truth.

2. **Emails are placed on the timeline.** An email sent at 1:15pm with subject "RE: Thompson exhibits" falls *inside* the prep block — it's already covered and should not generate a separate entry. An email sent at 3:30pm "RE: Thompson follow-up questions" falls *after* the block — it becomes a distinct 20-min "Client Communication" entry.

3. **Gaps are identified and filled.** If the calendar shows a court hearing from 9am–11am and a client meeting at 2pm, Claude can see that emails sent between 11:15am and 1:45pm represent unbookmarked work time. Those emails become the evidence for what happened in the gap.

4. **Duration estimation for emails improves.** Instead of assigning a flat 15–30 min per email, Claude can look at the volume and timing of an email thread. Five back-and-forth replies spanning 40 minutes becomes a single 40-min "Correspondence" entry rather than five separate estimates.

5. **Double-counting is prevented.** Any email whose timestamp falls within a calendar event's time range is flagged as potentially already captured. The review UI can surface these for the user to decide.

**Example output for one day:**

| Time | Source | Entry |
|---|---|---|
| 9:00–11:00am | Google Calendar | Court hearing — Smith v. Jones — 2.0 hrs |
| 11:15am | M365 mail (sent) | Post-hearing email to client re: outcome — Smith v. Jones — 0.25 hrs |
| 1:00–3:00pm | Google Calendar | Deposition prep — Thompson matter — 2.0 hrs |
| 3:30pm | M365 mail (sent) | Follow-up correspondence re: exhibit list — Thompson — 0.5 hrs |
| 4:45pm | M365 mail (sent, filing timestamp) | Court portal filing — Rivera matter — 0.25 hrs |

---

## Narrative Generation

Yes — both sources feed directly into narrative generation, the same way window tracking currently does. The existing `summarizer.py` sends raw context to Claude and gets back a client-facing billing description. For imports, the inputs change but the output format is identical.

| Source | Input to Claude | Example narrative output |
|---|---|---|
| Google Calendar event | Title + description + duration | "Attended hearing in Smith v. Jones before [court]; appeared on behalf of client" |
| M365 sent email | Subject + body snippet + recipient | "Drafted correspondence to opposing counsel re: discovery request in Thompson matter" |
| M365 received email requiring response | Subject + body snippet | "Reviewed and responded to client inquiry re: settlement offer" |
| Combined (same matter, same day) | Calendar block + related emails | "Prepared for and attended deposition in Thompson v. Rivera; follow-up correspondence with client re: exhibits" |

The last row is the most powerful: when multiple events and emails on the same day share a matter, Claude can consolidate them into a single narrative entry rather than listing each touchpoint individually — matching how a lawyer would actually write a time entry.

---

## What This Replaces in the Current Workflow

| Current step (Sheena) | Replaced by |
|---|---|
| Cross-references Google Calendar for court sessions and document prep blocks | Google Calendar integration — exact durations, auto matter-matched |
| Goes through sent items and inbox with client context | M365 mail integration — automated matter matching, estimated durations |
| Uses Outlook send timestamps to confirm court portal filings | Covered by Graph API sent folder timestamps |
| Goes through Shivani's phone for calls and texts | **Not covered** — requires separate approach (call log export or manual voice entry) |

---

## Data Flow into the App

Both integrations hit new import endpoints:
- `POST /api/import/calendar` — Google Calendar
- `POST /api/import/email` — M365 mail

The output follows the same pattern as the existing `create_manual_entry` route — Claude produces a list of draft activities, shown to the user for review before saving. No schema changes required; the existing `activities` table (with `start_time`, `end_time`, `narrative`, `matter_id`, `category`) handles the output.

---

## External Dependencies

### Google Calendar

| Dependency | Notes | Cost |
|---|---|---|
| Google Cloud Console project | Register app, enable Calendar API, get OAuth client credentials | Free |
| `google-auth-oauthlib` + `google-api-python-client` | Python packages for OAuth + API calls | Free/OSS |
| Localhost redirect URI | Desktop OAuth redirects to `http://127.0.0.1:{port}` — Electron handles this | — |
| App verification (production) | Google requires a review before OAuth apps can access Calendar data for arbitrary users. Dev/testing works with whitelisted accounts. Production requires ~1–2 week review. | Free, time cost |

### Microsoft 365

| Dependency | Notes | Cost |
|---|---|---|
| Azure Portal app registration | One-time setup — create app in Azure AD, configure permissions, get Client ID + Tenant ID | Free |
| `msal` Python package | Microsoft Authentication Library for Graph OAuth 2.0 | Free/OSS |
| Microsoft Graph API | Single API for mail and calendar — included with any M365 plan | Included in M365 |
| Admin consent | Delegated permissions (`Mail.Read`, `Calendars.Read`) don't require admin consent for the user's own account. Non-issue for a small firm where Shivani is effectively the admin. | — |

### Shared (both integrations)

| Dependency | Notes |
|---|---|
| macOS Keychain (`keyring` Python package) | OAuth refresh tokens stored securely in Keychain — not in SQLite or plaintext |
| No new Supabase infrastructure | Import runs locally; existing `SyncEngine` handles cloud sync |
| No new database schema | Existing `activities` table covers the output |

---

## Effort Estimate

| Area | Effort |
|---|---|
| Google Cloud Console + Azure Portal setup | 2–4 hours (one-time) |
| OAuth flow (both integrations, shared infrastructure) | 4–6 hours |
| Google Calendar fetch + Claude parsing | 4–6 hours |
| M365 mail fetch + Claude parsing | 4–6 hours |
| Shared import review UI (date range picker, confirm/edit/reject table) | 4–8 hours |
| Token storage (Keychain via `keyring`) | 2–3 hours |
| **Total** | **~4–5 days** |

Switching from IMAP to M365 (Graph API) reduces effort: Graph returns clean JSON with no MIME parsing, no SSL config, and no folder navigation quirks. If Shivani uses Outlook Calendar, the M365 session eliminates the need for a separate Google OAuth flow entirely.

---

## UX Flow

The integration touches three distinct moments: one-time account connection, triggering an import, and reviewing proposed entries. The third is by far the most important to get right.

---

### 1. Account Connection (Settings page — one-time)

A new **Integrations** section in the existing Settings page. Two connection cards, one per source:

```
┌─────────────────────────────────────────────────────────┐
│  Integrations                                           │
│                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │  🗓 Google Calendar      │  │  📧 Microsoft 365    │ │
│  │  Import court sessions   │  │  Import sent items   │ │
│  │  and prep blocks         │  │  and inbox           │ │
│  │                          │  │                      │ │
│  │  [Connect Google]        │  │  [Connect M365]      │ │
│  └──────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

After connecting, each card updates to show the connected account email, a green "Connected" status, and a "Disconnect" option. No other action needed — connection persists until revoked.

---

### 2. Triggering an Import (Timesheet page)

An **Import** button sits in the Timesheet header alongside the existing date controls. Clicking it opens a small popover:

```
┌─────────────────────────────────────┐
│  Import from connected accounts     │
│                                     │
│  Date range                         │
│  [Last 7 days ▾]  Apr 1 – Apr 7     │
│                                     │
│  Sources                            │
│  ☑  Google Calendar                 │
│  ☑  Microsoft 365 (mail)            │
│                                     │
│         [Cancel]  [Fetch & Analyze] │
└─────────────────────────────────────┘
```

"Fetch & Analyze" triggers the backend fetch + Claude analysis pipeline. A progress state shows what's happening inline:

```
Fetching Google Calendar...  ✓ 9 events
Fetching M365 sent items...  ✓ 38 emails
Analyzing with AI...         ✓ Done — 27 proposed entries
```

This typically takes 5–15 seconds depending on email volume.

---

### 3. The Review Screen (full-page modal)

The review screen is the core of the UX. With potentially 30–60 entries per week, the goal is to let Shivani approve the obvious entries in bulk and focus attention on the uncertain ones.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Review imported entries                                                  │
│  27 proposed · 9 matters · 18.25 hrs                                     │
│                                                                          │
│  [All (27)]  [Needs review (6)]  [Calendar (9)]  [Email (18)]            │
│                                            [Approve all confident]  [→]  │
├──────────────────────────────────────────────────────────────────────────┤
│  SMITH V. JONES                                                          │
│  ● Mon Apr 1   🗓  9:00–11:00am   2.0h   Court & Hearings               │
│    Attended hearing before [court]; appeared on behalf of client         │
│    ✓ Approve   ✕ Remove                                                  │
│                                                                          │
│  ● Mon Apr 1   📧  11:15am        0.25h  Client Communication            │
│    Post-hearing correspondence with client re: case outcome              │
│    ✓ Approve   ✕ Remove                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  THOMPSON MATTER                                                         │
│  ● Mon Apr 1   🗓  1:00–3:00pm    2.0h   Document Drafting               │
│    Prepared for deposition in Thompson v. Rivera                         │
│    ✓ Approve   ✕ Remove                                                  │
│                                                                          │
│  ◐ Mon Apr 1   📧  3:30pm         0.5h   Client Communication  ⚠        │
│    Follow-up correspondence re: exhibit list — matter unconfirmed        │
│    Matter: [Thompson Matter ▾]    ✓ Approve   ✕ Remove                  │
├──────────────────────────────────────────────────────────────────────────┤
│  UNASSIGNED (needs review)                                               │
│  ○ Tue Apr 2   📧  2:14pm         0.25h  Client Communication            │
│    RE: billing question — no matter matched                              │
│    Matter: [Select matter ▾]      ✓ Approve   ✕ Remove                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Confidence indicators (left dot):**
- `●` Solid — high confidence (calendar event, or email with explicit matter name in subject)
- `◐` Half — medium confidence (Claude inferred matter from email context or recipient)
- `○` Hollow — low confidence / unmatched (user must assign matter before approving)

**Inline editing:** Duration and narrative are click-to-edit inline. Matter is a dropdown. Category is a chip that opens a small picker. No separate edit modal needed.

**"Approve all confident" button:** Bulk-approves all solid `●` entries in one click. Shivani can then work through the `◐` and `○` entries manually.

**Overlap warnings:** If an email timestamp falls inside a calendar event's time range, the email row is indented under the event and labelled "May already be covered." Shivani decides whether to keep it or remove it.

---

### 4. Confirmation

After clicking the final **Confirm** button:

- A toast: *"21 entries added · 15.75 hrs across 8 matters"*
- Entries appear immediately in the Timesheet view
- An **Undo** option is available for 30 seconds to roll back the entire import if something looks wrong

There is no intermediate save state — either the full confirmed set is committed, or nothing is. This prevents partial imports from creating billing inconsistencies.

---

### Where Each Screen Lives in the Existing App

| Screen | Location | Notes |
|---|---|---|
| Account connection | `/settings` | New "Integrations" section, below existing settings |
| Import trigger | `/timesheet` | Button in the page header |
| Review screen | Full-page modal over `/timesheet` | Or a dedicated route `/import/review` — TBD |
| Confirmed entries | `/timesheet` | Entries appear inline, indistinguishable from manually entered ones |

---

## Open Questions

- Does Shivani's M365 tenant have any **conditional access or IT policies** that would require admin approval for third-party app consent?
- How should **duration estimation for emails** be handled in the review UI — should Claude's estimate be shown as editable, or should the user always set duration manually for email entries?
- Should **phone calls and texts** be handled via a separate voice entry flow, or is manual entry acceptable for now?
