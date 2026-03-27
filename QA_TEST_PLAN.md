# Donna — Manual QA Test Plan

> **How to use:** Work through each section in order. Check the box when a test passes. Add notes in the "Notes" column for any failures or observations.

---

## 1. App Launch & Permissions

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 1.1 | App loads successfully | Open `localhost:5173` in browser | App loads with sidebar, header, and Timeline page visible | [ ] |
| 1.2 | Auth token initializes | Open DevTools → Network → check `/api/init` call | Returns 200 with a bearer token | [ ] |
| 1.3 | Permission check (Accessibility granted) | Grant Accessibility in System Settings → reload app | Permission Guide does not appear, or shows green checkmark for Accessibility | [ ] |
| 1.4 | Permission check (Accessibility missing) | Revoke Accessibility permission → reload app | Permission Guide appears with red X badge and instructions to grant Accessibility | [ ] |
| 1.5 | Permission check (Screen Recording granted) | Grant Screen Recording → reload app | Green checkmark for Screen Recording | [ ] |
| 1.6 | Permission check (Screen Recording missing) | Revoke Screen Recording → reload app | Red X badge with instructions to enable Screen Recording | [ ] |
| 1.7 | "Check Again" button | Click "Check Again" on permission guide | Button shows loading state, re-fetches `/api/permissions`, updates badges | [ ] |

---

## 2. Navigation & Layout

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 2.1 | Sidebar displays all nav items | Look at sidebar | Shows: Donna logo, Timeline, Timesheet, Analytics, Clients & Matters, Settings (bottom), user avatar | [ ] |
| 2.2 | Navigate to Timeline | Click "Timeline" in sidebar | URL is `/`, Timeline page loads, nav item highlighted | [ ] |
| 2.3 | Navigate to Timesheet | Click "Timesheet" in sidebar | URL is `/timesheet`, Timesheet page loads, nav item highlighted | [ ] |
| 2.4 | Navigate to Analytics | Click "Analytics" in sidebar | URL is `/analytics`, Analytics page loads, nav item highlighted | [ ] |
| 2.5 | Navigate to Clients & Matters | Click "Clients & Matters" in sidebar | URL is `/clients`, Clients page loads, nav item highlighted | [ ] |
| 2.6 | Navigate to Settings | Click "Settings" in sidebar | URL is `/settings`, Settings page loads, nav item highlighted | [ ] |
| 2.7 | Active nav highlighting | Navigate between pages | Only the current page's nav item is highlighted at any time | [ ] |
| 2.8 | User profile in sidebar | Look at bottom of sidebar | Shows avatar with initial, name ("Shivam"), and email | [ ] |

---

## 3. Time Tracking — Core Flow

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 3.1 | Start tracking | Click "Start Tracking" button in header | Button changes to red "Stop Tracking", pulsing red dot appears, elapsed timer starts counting (HH:MM:SS) | [ ] |
| 3.2 | Timer increments | Watch the timer for 10+ seconds | Timer increments every second in monospace font | [ ] |
| 3.3 | Stop tracking | Click "Stop Tracking" | Button changes to spinner with "Processing..." text (blue), timer stops | [ ] |
| 3.4 | Processing completes | Wait for AI summarization to finish (poll `/api/status`) | Status returns to idle, "Start Tracking" button reappears, new session appears in the Timeline table | [ ] |
| 3.5 | Session appears after processing | Check the Timeline table after processing completes | New session row with time range, activity count, category pills, summary, and total hours | [ ] |
| 3.6 | Tracking persists across pages | Start tracking → navigate to Analytics → return to Timeline | Timer still running, red "Stop Tracking" still visible in header | [ ] |
| 3.7 | Tracking persists across refresh | Start tracking → refresh the page | Timer resumes (may lose a second or two), still shows tracking state | [ ] |
| 3.8 | Work hours blocking — outside hours | Enable work hours (e.g., 09:00–17:00) → attempt to start tracking outside that window | Alert appears saying tracking is blocked outside work hours, disappears after ~3 seconds, tracking does NOT start | [ ] |
| 3.9 | Work hours blocking — within hours | Enable work hours → start tracking within configured window | Tracking starts normally, no blocking alert | [ ] |
| 3.10 | Work hours disabled | Disable work hours toggle in Settings → start tracking at any time | Tracking starts regardless of time | [ ] |

---

## 4. Timeline Page

### 4A. Date Navigation

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4A.1 | Shows today's date | Load Timeline page | Header shows today's date (e.g., "Friday, March 27") | [ ] |
| 4A.2 | Navigate to previous day | Click left chevron | Date label changes to yesterday, sessions update | [ ] |
| 4A.3 | Navigate to next day | Go back one day, then click right chevron | Returns to today | [ ] |
| 4A.4 | Next day disabled on today | On today's date, check right chevron | Right chevron is disabled / unclickable | [ ] |
| 4A.5 | "Today" button | Navigate to a past date, click "Today" button | Returns to today's date | [ ] |
| 4A.6 | Today button disabled on today | On today's date, check "Today" button | Button is disabled | [ ] |

### 4B. Session Display

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4B.1 | Session row content | Look at a completed session row | Shows: time range (e.g., "9:02 AM – 12:34 PM"), activity count badge, category bar, category pills with percentages, total hours | [ ] |
| 4B.2 | Session summary | Check below the category pills | AI-generated narrative summary is displayed | [ ] |
| 4B.3 | Expand session | Click on a session row | Row expands to show individual activity rows | [ ] |
| 4B.4 | Collapse session | Click the expanded session row again | Activities collapse back | [ ] |
| 4B.5 | Empty state | Navigate to a date with no sessions | Shows "No sessions recorded for this day" message | [ ] |

### 4C. Activity Rows (Expanded)

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4C.1 | Activity row content | Expand a session | Each activity shows: app name + context, hours, narrative, matter assignment, activity code, billable indicator | [ ] |
| 4C.2 | Edit narrative inline | Click on an activity's narrative text | Field becomes editable textarea; modify text and blur/press Enter | [ ] |
| 4C.3 | Save narrative | Edit narrative → blur or press Enter | Narrative saves (no error), new text persists on page refresh | [ ] |
| 4C.4 | Edit hours inline | Click on an activity's hours value | Field becomes editable number input | [ ] |
| 4C.5 | Save hours | Change hours to a valid value (e.g., 1.5) → save | Hours update, summary stats recalculate | [ ] |
| 4C.6 | Edit matter assignment | Click the matter dropdown on an activity | Dropdown shows grouped options: Billable matters, Non-billable matters, Unassigned | [ ] |
| 4C.7 | Reassign matter | Select a different matter from dropdown | Activity's matter updates, billable status may change accordingly | [ ] |
| 4C.8 | Edit activity code | Click activity code selector | UTBMS code dropdown appears with options | [ ] |
| 4C.9 | Activity save error | Trigger a save error (e.g., disconnect network, then edit) | Red error message appears below the field, auto-dismisses after ~3 seconds | [ ] |

### 4D. Bulk Operations

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4D.1 | Select single activity | Check the checkbox on one activity | Checkbox checked, selection counter appears | [ ] |
| 4D.2 | Select multiple activities | Check checkboxes on several activities | Counter updates (e.g., "3 selected") | [ ] |
| 4D.3 | Select all (header checkbox) | Click the header row checkbox | All visible activities selected, checkbox shows checked state | [ ] |
| 4D.4 | Partial selection indicator | Select some but not all activities | Header checkbox shows indeterminate state | [ ] |
| 4D.5 | Bulk delete | Select multiple activities → click delete button | Confirmation dialog appears asking to confirm deletion | [ ] |
| 4D.6 | Confirm bulk delete | Click confirm in the dialog | Selected activities are removed, summary stats update | [ ] |
| 4D.7 | Cancel bulk delete | Click cancel in the dialog | No activities deleted, selection preserved | [ ] |
| 4D.8 | Cancel selection | Click "Cancel" on the selection bar | All checkboxes unchecked, counter disappears | [ ] |

### 4E. Summary Stats

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 4E.1 | Total hours | Check summary stats area | Shows total hours for the day (e.g., "3.5 hrs") | [ ] |
| 4E.2 | Activity count | Check summary stats | Shows total number of activities | [ ] |
| 4E.3 | Billable value | Check summary stats | Shows total billable value (e.g., "$525.00") | [ ] |
| 4E.4 | Stats update after edit | Edit an activity's hours → check stats | Total hours and billable value recalculate | [ ] |
| 4E.5 | Stats update after delete | Delete an activity → check stats | Totals decrease accordingly | [ ] |

---

## 5. Timesheet Page

### 5A. Matter Grouping

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5A.1 | Activities grouped by matter | Open Timesheet page on a day with activities | Activities are grouped under matter cards, sorted alphabetically | [ ] |
| 5A.2 | Unassigned section | Have activities with no matter assigned | "Unassigned" section appears at the end | [ ] |
| 5A.3 | Matter card info | Look at a matter card header | Shows: client name, matter name, matter number, practice area, billing type, rate, total hours | [ ] |
| 5A.4 | Expand matter card | Click on a matter card | Shows individual activities within that matter | [ ] |
| 5A.5 | Collapse matter card | Click expanded card again | Activities collapse | [ ] |

### 5B. Matter Card Editing

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5B.1 | Edit matter narrative | Click the combined narrative on a matter card | Textarea becomes editable with aggregated narrative | [ ] |
| 5B.2 | Save matter narrative | Edit and save the narrative | Updates persist on refresh | [ ] |
| 5B.3 | Edit matter total hours | Click on the total hours for a matter | Input becomes editable | [ ] |
| 5B.4 | Hours distribute proportionally | Change total hours from 3.0 to 6.0 (doubling) | Individual activity hours within the matter scale proportionally | [ ] |
| 5B.5 | Reassign all activities | Click "Reassign" on a matter card → select new matter | All activities move to the new matter card | [ ] |
| 5B.6 | Delete all activities in matter | Click delete on a matter card → confirm | All activities in that matter are deleted, card disappears | [ ] |

### 5C. Add Manual Entry

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5C.1 | Open add entry form | Click "Add Entry" button | Form appears with: narrative, hours, activity code, matter selector | [ ] |
| 5C.2 | Fill and save entry | Enter narrative, hours (e.g., 1.5), select matter → save | New activity appears under the selected matter's card | [ ] |
| 5C.3 | Validation — empty narrative | Leave narrative blank → try to save | Error message, save blocked | [ ] |
| 5C.4 | Validation — invalid hours | Enter 0 or negative hours → try to save | Error message, save blocked | [ ] |
| 5C.5 | Matter selector grouping | Open matter dropdown in add entry form | Options grouped into Billable and Non-billable sections | [ ] |
| 5C.6 | UTBMS code selection | Select a UTBMS code (e.g., L210) | Code saves, legal category auto-derives (e.g., "Document Drafting") | [ ] |
| 5C.7 | Cancel add entry | Click "Cancel" on the form | Form closes, no entry created | [ ] |

### 5D. Release & Export

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 5D.1 | Release timesheet | Click "Release Timesheet" button | Green "Released" badge appears with checkmark | [ ] |
| 5D.2 | Release persists | Release timesheet → refresh page | Badge still shows "Released" | [ ] |
| 5D.3 | Unrelease timesheet | Click "Unrelease" button | Badge disappears, timesheet is editable again | [ ] |
| 5D.4 | Export CSV | Click "Export CSV" button | Browser downloads a file named `timesheet-YYYY-MM-DD.csv` | [ ] |
| 5D.5 | CSV content | Open the downloaded CSV | Contains columns: date, matter, hours, narrative, category, billable, activity_code; data matches what's on screen | [ ] |
| 5D.6 | Export empty day | Navigate to a day with no activities → click Export | CSV downloads with headers but no data rows (or appropriate empty handling) | [ ] |

---

## 6. Analytics Page

### 6A. Period Selection

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6A.1 | Default period | Load Analytics page | Defaults to "This Month" | [ ] |
| 6A.2 | Preset — Today | Click "Today" preset | Date range set to today only, data refreshes | [ ] |
| 6A.3 | Preset — This Week | Click "This Week" | Date range set to Mon–Sun of current week | [ ] |
| 6A.4 | Preset — This Month | Click "This Month" | Date range set to 1st–last of current month | [ ] |
| 6A.5 | Preset — Last Month | Click "Last Month" | Date range set to previous month | [ ] |
| 6A.6 | Preset — This Quarter | Click "This Quarter" | Date range set to current quarter (e.g., Jan 1 – Mar 31) | [ ] |
| 6A.7 | Preset — YTD | Click "YTD" | Date range set to Jan 1 – today | [ ] |
| 6A.8 | Custom date range | Manually set start and end dates using date pickers | Data refreshes for the selected range | [ ] |

### 6B. Summary KPI Cards

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6B.1 | Billable Hours | Check first KPI card | Shows billable hours with total hours subtitle | [ ] |
| 6B.2 | Revenue | Check second KPI card | Shows dollar amount with projected monthly revenue | [ ] |
| 6B.3 | Utilization Rate | Check third KPI card | Shows percentage with available hours subtitle | [ ] |
| 6B.4 | Effective Rate | Check fourth KPI card | Shows $/hr blended rate, or "—" if no rates configured | [ ] |
| 6B.5 | KPIs update with period | Change period selection | All KPI values recalculate | [ ] |
| 6B.6 | Loading state | Change period quickly | Skeleton/pulse loading state appears briefly while data loads | [ ] |

### 6C. Charts

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6C.1 | Billable Hour Trend | Check trend chart | Line chart showing billable vs non-billable hours over the selected period | [ ] |
| 6C.2 | Revenue Forecast | Check forecast chart | Shows projection line based on daily average and working days remaining | [ ] |
| 6C.3 | Category Breakdown | Check category chart | Donut/pie chart showing time by legal category (Legal Research, Document Drafting, etc.) | [ ] |
| 6C.4 | Chart tooltips | Hover over chart data points | Tooltip appears with detailed values | [ ] |

### 6D. Matter Ranking

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6D.1 | Top matters list | Check matter ranking table | Shows top 10 matters by revenue with: rank, name, hours, revenue, %, avg rate | [ ] |
| 6D.2 | Sort by column | Click a column header (e.g., "Hours") | Table sorts by that column; sort indicator shows direction | [ ] |
| 6D.3 | Toggle sort direction | Click the same column header again | Sort direction reverses | [ ] |
| 6D.4 | Show all matters | Click "Show all" toggle (if >10 matters) | Full list displayed | [ ] |

### 6E. Empty & Edge States

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 6E.1 | No data for period | Select a date range with no tracked time | "No activity recorded for this period" message with suggestion to select different range | [ ] |
| 6E.2 | All non-billable | Have only non-billable activities in range | Revenue shows $0, Effective Rate shows "—", Utilization shows 0% | [ ] |
| 6E.3 | No rates configured | Have billable activities but no rates on matters/clients | Revenue shows $0, Effective Rate shows "—" | [ ] |

---

## 7. Clients & Matters

### 7A. Client Management

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7A.1 | View clients list | Navigate to Clients & Matters page | Shows list of clients with matter counts and rates | [ ] |
| 7A.2 | Internal client first | Check client ordering | Internal client always appears first in the list | [ ] |
| 7A.3 | Internal client restrictions | Check internal client row | Edit and Delete buttons are disabled/hidden | [ ] |
| 7A.4 | Create client | Click "Add Client" → fill name + rate → save | Modal appears, client created, appears in list | [ ] |
| 7A.5 | Client name required | Try to save client with empty name | Validation error, save blocked | [ ] |
| 7A.6 | Edit client | Click Edit on a client → change name → save | Client name updates in the list | [ ] |
| 7A.7 | Delete client (no active matters) | Click Delete on a client with no active matters → confirm | Client removed from list | [ ] |
| 7A.8 | Delete client (has active matters) | Try to delete a client with active matters | Deletion blocked or shows warning | [ ] |
| 7A.9 | Expand client | Click on a client row | Expands to show the client's matters | [ ] |
| 7A.10 | Collapse client | Click expanded client row | Matters collapse | [ ] |
| 7A.11 | Closed matters count | Have closed matters on a client | Footer shows "X closed matters" | [ ] |
| 7A.12 | Empty state | Delete all clients (except internal) | Shows empty state with briefcase icon and "Add Your First Client" button | [ ] |

### 7B. Matter Management

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7B.1 | Create matter | Expand a client → click "Add Matter" → fill form → save | Matter appears under the client | [ ] |
| 7B.2 | Matter name required | Try to save matter with empty name | Validation error, save blocked | [ ] |
| 7B.3 | Billing type — hourly | Set billing type to "hourly" | Hourly rate field becomes required/visible | [ ] |
| 7B.4 | Billing type — non-billable | Set billing type to "non-billable" | Rate field hidden or irrelevant | [ ] |
| 7B.5 | Edit matter | Click Edit on a matter → change fields → save | Matter updates in place | [ ] |
| 7B.6 | Delete matter (no activities) | Delete a matter with no linked activities | Matter is hard-deleted, removed from list | [ ] |
| 7B.7 | Delete matter (has activities) | Delete a matter that has time entries | Confirmation dialog notes it will be closed, not deleted; matter status becomes "closed" | [ ] |
| 7B.8 | Keywords input | Add keywords (comma-separated, e.g., "research, memo, brief") | Keywords saved as array, displayed as tags | [ ] |
| 7B.9 | Key people | Add a key person (name + role) → save | Person appears in matter detail, persists on refresh | [ ] |
| 7B.10 | Team members | Add a team member (name + role) → save | Member appears in matter detail | [ ] |
| 7B.11 | Remove key person | Click remove on a key person → save | Person removed from list | [ ] |
| 7B.12 | Matter number | Enter a matter number (e.g., "2024-CV-1234") → save | Number displays on matter card in Timesheet and Clients pages | [ ] |
| 7B.13 | Practice area | Enter a practice area (e.g., "Litigation") → save | Practice area displays on matter card | [ ] |

### 7C. Client Modal

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7C.1 | Modal opens on create | Click "Add Client" | Modal opens with empty form, title says "New Client" or similar | [ ] |
| 7C.2 | Modal opens on edit | Click Edit on existing client | Modal opens pre-filled with client data | [ ] |
| 7C.3 | Close via X button | Click X in top-right of modal | Modal closes without saving | [ ] |
| 7C.4 | Close via backdrop click | Click outside the modal | Modal closes without saving | [ ] |
| 7C.5 | Save button loading state | Click save → observe button | Button shows loading/disabled state during API call | [ ] |

### 7D. Matter Modal

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 7D.1 | Scrollable for long content | Add many key people and team members | Modal scrolls vertically (max-height 90vh) | [ ] |
| 7D.2 | Rate conditional on billing type | Switch billing type between hourly and non-billable | Rate input appears/disappears accordingly | [ ] |

---

## 8. Settings

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 8.1 | Work hours toggle — enable | Toggle work hours ON | Start and end time inputs appear | [ ] |
| 8.2 | Work hours toggle — disable | Toggle work hours OFF | Time inputs disappear | [ ] |
| 8.3 | Set start time | Enter a start time (e.g., 09:00) | Value accepted and saved | [ ] |
| 8.4 | Set end time | Enter an end time (e.g., 17:00) | Value accepted and saved | [ ] |
| 8.5 | Status indicator — within hours | Set hours to include current time | Shows "Currently within work hours" (green) | [ ] |
| 8.6 | Status indicator — outside hours | Set hours to exclude current time | Shows "Currently outside work hours" (orange) | [ ] |
| 8.7 | Settings persist | Configure work hours → refresh page | Settings are preserved (stored in localStorage) | [ ] |
| 8.8 | Settings persist across pages | Configure settings → navigate to Timeline → return to Settings | Values unchanged | [ ] |
| 8.9 | Overnight hours | Set start=22:00, end=06:00 | App correctly interprets overnight range (no false blocking) | [ ] |

---

## 9. Edge Cases & Data Integrity

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 9.1 | Zero activities for a session | If possible, create a session with no activities | Session row handles gracefully (no crash, shows 0 hrs) | [ ] |
| 9.2 | Very long session (8+ hours) | Track for a long session or create one via API | Timer, session display, and hours all handle large values | [ ] |
| 9.3 | Rate hierarchy — matter rate wins | Set client rate=$200, matter rate=$350 → check activity | Activity's effective_rate is $350 | [ ] |
| 9.4 | Rate hierarchy — falls back to client | Set client rate=$200, leave matter rate blank → check activity | Activity's effective_rate is $200 | [ ] |
| 9.5 | Rate hierarchy — no rate | Leave both client and matter rate blank | Effective rate is null/0, revenue shows $0 | [ ] |
| 9.6 | Non-billable matter → billable=false | Assign activity to a non-billable matter | Activity becomes non-billable, no revenue calculated | [ ] |
| 9.7 | Reassign to billable matter | Move activity from non-billable to billable matter | Activity becomes billable, revenue recalculates | [ ] |
| 9.8 | Unassigned activity | Create an activity with no matter | Shows as "Unassigned", billable=true but effective_rate=null | [ ] |
| 9.9 | Delete activity then check stats | Delete an activity → check Timeline summary stats and Analytics | All totals reflect the deletion | [ ] |
| 9.10 | Rapid start/stop | Start tracking → immediately stop | Handles gracefully, short session created or appropriate message | [ ] |
| 9.11 | Double-click start | Click "Start Tracking" twice quickly | Only one session starts, no duplicate | [ ] |
| 9.12 | Refresh during processing | Stop tracking → refresh page while "Processing..." | Page reloads with processing state, completes normally when done | [ ] |
| 9.13 | Manual entry on past date | Add a manual entry on a date with no existing session | Auto-creates a session for that date, activity appears | [ ] |
| 9.14 | CSV export with special characters | Create an activity narrative with commas, quotes, newlines | CSV properly escapes all special characters | [ ] |

---

## 10. Responsive & Mobile

> Test by resizing browser or using DevTools device emulation (e.g., iPhone 14 viewport).

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 10.1 | Sidebar hidden on mobile | Resize to <768px width | Sidebar disappears, hamburger menu icon appears top-left | [ ] |
| 10.2 | Hamburger opens sidebar | Click hamburger icon | Sidebar slides in as overlay with semi-transparent backdrop | [ ] |
| 10.3 | Sidebar closes on nav | Click a nav item in mobile sidebar | Sidebar closes, page navigates | [ ] |
| 10.4 | Sidebar closes on backdrop | Click the dark backdrop behind mobile sidebar | Sidebar closes | [ ] |
| 10.5 | Timeline table stacks | View Timeline on mobile | Session rows and activity rows stack vertically, no horizontal scroll | [ ] |
| 10.6 | Timesheet cards stack | View Timesheet on mobile | Matter cards are single-column, fully readable | [ ] |
| 10.7 | Analytics grid stacks | View Analytics on mobile | Charts and KPI cards stack to single column | [ ] |
| 10.8 | Forms usable on mobile | Open a modal (e.g., Add Client) on mobile | Modal is scrollable, all fields reachable, save button visible | [ ] |
| 10.9 | Header controls on mobile | Check header on mobile | Date nav, tracking button, and timer remain usable | [ ] |
| 10.10 | No horizontal scrolling | Scroll horizontally on any page at mobile width | No content overflows or causes horizontal scroll | [ ] |

---

## 11. Real-Time & WebSocket

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 11.1 | WebSocket connects | Open DevTools → Network → WS tab | WebSocket connection established to `/ws?token=...` | [ ] |
| 11.2 | Tracking state syncs | Start tracking → check if header updates without manual refresh | Real-time status update via WebSocket | [ ] |
| 11.3 | Session completion notification | Stop tracking → wait for processing | Session appears in table automatically when summarization completes (no manual refresh needed) | [ ] |
| 11.4 | WebSocket reconnection | Kill the backend briefly → restart it | Frontend reconnects WebSocket after backend is back (may take a few seconds) | [ ] |

---

## 12. Performance Checks

| # | Test Case | Steps | Expected Result | Pass |
|---|-----------|-------|-----------------|------|
| 12.1 | Initial page load | Hard refresh the app | Page fully interactive within 3 seconds | [ ] |
| 12.2 | Page navigation speed | Click between sidebar nav items | Each page renders within 1 second | [ ] |
| 12.3 | Large session list | Navigate to a day with 5+ sessions | Scrolls smoothly, no visible lag | [ ] |
| 12.4 | Analytics calculation | Load Analytics with a month of data | KPIs and charts render within 2 seconds | [ ] |
| 12.5 | Inline edit responsiveness | Click to edit an activity field | Edit mode activates instantly (<200ms perceived) | [ ] |

---

## Test Run Log

| Run # | Date | Tester | Environment | Pass / Total | Notes |
|-------|------|--------|-------------|--------------|-------|
| 1 | | | | / 120 | |
| 2 | | | | / 120 | |
| 3 | | | | / 120 | |
