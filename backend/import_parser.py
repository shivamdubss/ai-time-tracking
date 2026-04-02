"""Claude-powered parsing of calendar events and emails into billable time entries.

Builds a unified timeline from both sources — calendar events anchor exact durations,
emails fill in gaps and are flagged when they overlap with calendar blocks.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import anthropic

logger = logging.getLogger("timetrack")

MODEL = os.getenv("TIMETRACK_MODEL", "claude-sonnet-4-20250514")

IMPORT_SYSTEM_PROMPT = """You are parsing calendar events and emails into billable time entries for a lawyer's docketing system.

You receive a list of active matters, a list of calendar events, and a list of emails.
Your job is to convert each item into a structured billing entry.

RULES:

Calendar events:
- Confidence = "high" — duration is exact from start/end times
- Match matter from the event title (look for client names, case names, matter keywords)
- Category: hearings/court → "Court & Hearings", prep/drafting → "Document Drafting", calls/meetings with client → "Client Communication", research → "Legal Research", admin → "Administrative"

Emails (sent items):
- Estimate duration: short reply = 15 min, substantive email = 30 min, complex multi-part = 45 min
- Confidence based on how clearly the matter can be identified from subject/body
- Category: usually "Client Communication" unless clearly something else (e.g., court filing → "Administrative")
- Flag overlap = true if the email's sent time falls within a calendar event's time range

Thread de-duplication:
- If multiple emails share the same subject thread (RE:/FW: prefix), combine into one entry
- Use the total time span or 15 min per email, whichever is larger

Narratives:
- Billing-quality: action verb + specific work + connection to matter strategy
- Good: "Drafted motion to compel discovery in Smith v. Jones; outlined evidentiary basis for production demand"
- Bad: "Worked on case" or "Sent email"

Return ONLY valid JSON — an array of entry objects with this exact schema:
[
  {
    "id": "unique string",
    "source": "calendar" or "email",
    "date": "Mon Apr 1",
    "time": "9:00 – 11:00am",
    "start_time": "2026-04-01T09:00:00",
    "end_time": "2026-04-01T11:00:00",
    "duration": 120,
    "category": "Court & Hearings",
    "matter_id": "uuid-or-null",
    "matter_name": "Smith v. Jones or null",
    "narrative": "billing narrative text",
    "confidence": "high",
    "overlap": false
  }
]

Duration is in minutes. For emails with no exact end time, set end_time = null.
If a matter cannot be matched, set matter_id and matter_name to null and confidence to "low".
Return ONLY the JSON array — no prose, no code fences.
"""


def _fmt_date(iso: str) -> str:
    """Convert ISO timestamp to display date like 'Mon Apr 1'."""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%a %b %-d")
    except Exception:
        return iso[:10]


def _fmt_time_range(start_iso: str, end_iso: str | None) -> str:
    """Convert ISO timestamps to display range like '9:00 – 11:00am'."""
    try:
        start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        if end_iso:
            end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
            start_str = start.strftime("%-I:%M").lstrip("0") or "12:00"
            end_str = end.strftime("%-I:%M%p").lower().lstrip("0") or "12:00am"
            return f"{start_str} – {end_str}"
        return start.strftime("%-I:%M%p").lower().lstrip("0") or "12:00am"
    except Exception:
        return start_iso


def _build_matters_context(matters: list[dict]) -> str:
    if not matters:
        return "No active matters configured."
    lines = ["Active matters for matching:"]
    for m in matters:
        client = m.get("client_name", "Unknown Client")
        name = m.get("name", "Unknown")
        mid = m.get("id", "")
        keywords = m.get("keywords", [])
        billing = m.get("billing_type", "hourly")
        line = f"  - [{mid}] {client} / {name}"
        if keywords:
            line += f" (keywords: {', '.join(keywords)})"
        if billing == "non-billable":
            line += " [NON-BILLABLE]"
        lines.append(line)
    return "\n".join(lines)


def _build_events_context(events: list[dict]) -> str:
    if not events:
        return "No calendar events."
    lines = ["Calendar events:"]
    for ev in events:
        start = ev.get("start", {})
        end = ev.get("end", {})
        start_dt = start.get("dateTime", start.get("date", ""))
        end_dt = end.get("dateTime", end.get("date", ""))
        title = ev.get("summary", "(no title)")
        description = ev.get("description", "")
        desc_snippet = f" — {description[:120]}" if description else ""
        lines.append(f"  - [{start_dt} → {end_dt}] {title}{desc_snippet}")
    return "\n".join(lines)


def _build_emails_context(emails: list[dict]) -> str:
    if not emails:
        return "No emails."
    lines = ["Emails (Microsoft 365 sent items):"]
    for em in emails:
        subject = em.get("subject", "(no subject)")
        sent = em.get("sentDateTime", "")
        preview = em.get("bodyPreview", "")[:150]
        recipients = em.get("toRecipients", [])
        to_str = ", ".join(r.get("emailAddress", {}).get("address", "") for r in recipients[:3])
        lines.append(f"  - [{sent}] To: {to_str} | Subject: {subject} | {preview}")
    return "\n".join(lines)


def parse_import(
    calendar_events: list[dict],
    emails: list[dict],
    matters: list[dict],
) -> list[dict]:
    """Parse calendar events and emails into proposed time entries via Claude.

    Returns a list of dicts matching the ProposedEntry shape expected by the frontend.
    """
    client = anthropic.Anthropic()

    matters_ctx = _build_matters_context(matters)
    events_ctx = _build_events_context(calendar_events[:50])
    emails_ctx = _build_emails_context(emails[:50])

    user_content = f"{matters_ctx}\n\n{events_ctx}\n\n{emails_ctx}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=IMPORT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    response_text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1])

    entries: list[dict] = json.loads(response_text)

    # Ensure each entry has a unique id
    for entry in entries:
        if not entry.get("id"):
            entry["id"] = str(uuid.uuid4())

    return entries
