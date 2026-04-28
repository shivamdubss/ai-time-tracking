# Donna — Demo Talk Track

**App:** Time tracking for family law attorneys
**Demo URL:** https://frontend-phi-smoky-17.vercel.app/?demo
**Audience:** Solo / small-firm family law attorneys
**Length:** ~5–7 minutes
**Goal:** Show that Donna captures billable time *automatically* and turns it into invoice-ready entries — without changing how the attorney works.

---

## 0. Cold open (15s)

> "Most family law attorneys lose 6–8 billable hours a week to memory. They write the timesheet at the end of the day — or worse, the end of the week — and round down everything they can't remember. Donna fixes that. She keeps track of your work in the background and writes the timesheet for you. Think of her as the assistant who quietly drafts your time entries while you focus on the legal work."

Open the app. We're already on the Timeline page with today's data populated.

---

## 1. The Timeline — "what you actually did today" (90s)

**Page:** `/` (Timeline)

> "This is what your day looked like, drafted automatically. Donna pulls from the apps, documents, and emails you've already worked in and groups them into activities — the same way a paralegal would reconstruct your day from your calendar and your sent folder."

**Point at:**
- The flat list of activity rows with start/end times
- A row tied to **Martinez — Dissolution of Marriage** — "30 minutes drafting the RSU valuation memo in Word"
- An email row tied to **Thompson — Custody Modification** — "Outlook thread with opposing counsel about the Portland relocation"
- A non-billable row tied to **Administrative** — "calendar, expense report"

> "Notice the matter is already attached. Donna matched the file name, the email subject, and the calendar event against your client list. No manual tagging."

**Show:**
- Click a matter dropdown on a row → re-assign to a different matter ("if it guesses wrong, one click to fix")
- Editable start/end times → "trim a row if you want to bill less than the full block"

**Top right:**
- Point at the **Active** pill + **Auto Capture** toggle → "It runs in the background. Toggle it off whenever you step away."

---

## 2. The Timesheet — "what you can bill" (90s)

**Page:** `/timesheet`

> "End of the day or end of the week, this is the page you live on."

**Point at:**
- Date range picker (today / this week / last week / custom)
- Client + Matter filters
- Grouped list — one section per client → matter → entries

> "Every entry has a description Donna wrote from the underlying activity. You can edit any of them inline. Set the billing increment — six minutes, fifteen minutes, whatever your firm uses — and Donna rounds for you."

**Show:**
- Pick **Martinez** in the client filter → "Here's everything for Martinez this week — 6.4 hours across three matters."
- Hit **Export** → PDF / Excel / Word options
  > "This drops straight into Clio, MyCase, or whatever practice management you're using. Or send the PDF to a client."

---

## 3. Integrations — "she works from the tools you already use" (45s)

**Page:** `/settings` (Integrations section)

> "Donna doesn't ask your attorneys to learn a new tool. She works from what they already use."

**Point at:**
- **Google Calendar** connected → "client meetings, court appearances, depositions all become billable entries"
- **Microsoft 365** connected → "Outlook emails and Word documents auto-tag to the right matter"

> "On the desktop app, Donna also picks up the local files and apps you have open — so a Word doc you never emailed still becomes a billable entry. The web demo is read-only on integrations, but it's the same experience."

---

## 4. Analytics — "where the money's going" (60s)

**Page:** `/analytics`

> "Once you've got a few weeks of real data, this is where partners look."

**Point at:**
- Billable vs. non-billable hours split
- Hours by client → "you'll see Martinez is 38% of your time this month"
- Hours by matter type → "divorces vs. custody vs. adoptions"
- A non-billable line — admin, CLE, biz dev, pro bono → "this is the time most attorneys don't track at all. We surface it so you can decide what to cut."

---

## 5. Clients & Matters — "the source of truth" (30s)

**Page:** `/clients`

> "All your clients and matters in one place. Donna uses the keywords, key people, and team members on each matter to do the auto-matching."

**Point at:**
- A client card (e.g. **Martinez**) with three open matters
- Open one matter → show the rich notes, key people (opposing counsel, forensic accountant), team members (paralegal)

> "If you import from Clio or set this up once, the matching just works."

---

## 6. Close (30s)

> "So — three things to take away.
>
> One: time capture is **automatic**. No timers, no end-of-day reconstruction.
>
> Two: every entry is **already attached to a matter** with a description ready to bill.
>
> Three: nothing changes about how you work — Donna sits behind Outlook, Word, and your calendar.
>
> The desktop app installs in two minutes. Want me to send a download link?"

---

## Backup / FAQ talk track

**"What about privacy? Donna is seeing everything I do."**
> "Donna runs locally on your machine — think of her as an assistant who only sits at *your* desk. We don't see your files, your emails, or your client data. The matching happens on-device, and only the timesheet entries you decide to keep ever leave your laptop. Nothing is sent to us, nothing is stored on our servers without your say-so."

**"Does it work with Clio / MyCase / PracticePanther?"**
> "Yes — Excel and PDF exports drop in directly. We're shipping a native Clio integration in [Q-whatever]."

**"What happens when Donna gets the matter wrong?"**
> "One-click reassign on every row. Donna learns from corrections — if you re-tag three Martinez emails to a new matter, it'll start tagging future ones automatically."

**"Can I bill in 6-minute increments?"**
> "Yes. Set it once in Settings. 6, 10, 15 — whatever your firm uses."

**"What if I'm not at my computer? Court, client meetings, phone calls."**
> "Calendar entries become billable rows automatically. For phone calls not on the calendar, add a manual entry — same row format as everything else."

---

## Demo prep checklist

- [ ] Open `https://frontend-phi-smoky-17.vercel.app/?demo` in an incognito window
- [ ] Confirm Timeline shows today's activities (not empty)
- [ ] Pre-set date range on Timesheet to "This week"
- [ ] Have Martinez client filter ready to demo
- [ ] Close any noisy notifications / dock badges
- [ ] Zoom browser to 110% so labels are readable on screen-share
