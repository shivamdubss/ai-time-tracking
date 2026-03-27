import base64
import json
import os
from datetime import datetime
from pathlib import Path

import anthropic

MODEL = os.getenv("TIMETRACK_MODEL", "claude-sonnet-4-20250514")


SYSTEM_PROMPT = """You are an AI assistant that analyzes work sessions for a legal time tracking application. Given a chronological log of window activity and optional screenshots, produce a structured JSON summary.

Return ONLY valid JSON with this exact schema:
{
  "summary": "High-level 1-2 sentence overview of the session.",
  "categories": [
    { "name": "Legal Research", "minutes": 45, "percentage": 38 },
    { "name": "Document Drafting", "minutes": 30, "percentage": 25 }
  ],
  "activities": [
    {
      "app": "Microsoft Word",
      "context": "Drafting motion to compel",
      "minutes": 40,
      "start_time": "2026-03-26T09:15:00",
      "end_time": "2026-03-26T09:55:00",
      "narrative": "Drafted and revised motion to compel discovery responses in Smith v. Jones",
      "category": "Document Drafting",
      "activity_code": "L160"
    }
  ]
}

Rules:
- Categories must be one of: Legal Research, Document Drafting, Client Communication, Court & Hearings, Case Review, Administrative
- Legal Research: Westlaw, LexisNexis, Fastcase, Google Scholar, court websites, legal databases
- Document Drafting: Word, Google Docs, Adobe Acrobat, Pages, any document editing
- Client Communication: Email apps, messaging apps, video calls (non-court)
- Court & Hearings: Zoom/Teams court appearances, e-filing systems, court portals
- Case Review: Document management systems, PDF viewers, file browsers reviewing case materials
- Administrative: Calendar, billing, firm management, non-case browsing, general admin
- Percentages must sum to 100
- Minutes should be approximate based on the time spent in each app
- start_time and end_time must be ISO 8601 timestamps derived from the window activity timeline
- Narratives should follow legal billing format: action verb + what + why/for whom
- Narratives should be specific and descriptive, not vague (avoid "worked on case")
- Context should briefly describe the work being performed (e.g., "drafting motion to compel", "researching case law", "email correspondence"), NOT the specific document name, file path, or case reference
- Group related activities by app (e.g., multiple Word windows = one activity)
- Summary should be 1-2 sentences, specific about what was accomplished
- Each activity MUST include a category field matching one of the six categories above
- Each activity MUST include an activity_code from the UTBMS Litigation Code Set:
  L100: Case Assessment, Development and Administration
  L110: Fact Investigation/Development
  L120: Analysis/Strategy
  L130: Experts/Consultants
  L140: Document/File Management
  L150: Budgeting
  L160: Settlement/Non-Binding ADR
  L190: Other Case Assessment
  L200: Pre-Trial Pleadings and Motions
  L210: Pleadings
  L220: Preliminary Injunctions/Provisional Remedies
  L230: Court Mandated Conferences
  L240: Dispositive Motions
  L250: Other Written Motions and Submissions
  L300: Discovery
  L310: Written Discovery
  L320: Document Production
  L330: Depositions
  L340: Expert Discovery
  L400: Trial Preparation and Trial
  L410: Fact Witnesses
  L420: Expert Witnesses
  L430: Written Motions and Submissions
  L440: Hearing/Trial Attendance
  L500: Appeal
  L510: Appellate Briefs and Written Motions
  L520: Appellate Court Attendance
  A101: Plan and Prepare for, and Attend, Meeting
  A102: Communicate (includes Telephone Calls, Emails, Letters)
  A103: Draft/Revise
  A104: Review/Analyze
  A106: File/Serve
  Choose the most specific applicable code. Default to L140 for file management, A102 for communication, A103 for drafting, A104 for review/analysis."""


def build_timeline(window_entries: list[dict], idle_threshold_seconds: float = 300) -> str:
    """Convert raw window entries into a readable timeline, annotating idle gaps."""
    if not window_entries:
        return "No window activity recorded."

    lines = []
    prev_app = None
    prev_title = None
    start_ts = None
    start_dt = None

    for entry in window_entries:
        app = entry.get("app", "Unknown")
        title = entry.get("title", "")
        ts = entry.get("timestamp", "")

        if app != prev_app or title != prev_title:
            if prev_app and start_ts and start_dt:
                lines.append(f"[{start_ts}] {prev_app}: {prev_title}")
                try:
                    current_dt = datetime.fromisoformat(ts)
                    run_duration = (current_dt - start_dt).total_seconds()
                    if run_duration >= idle_threshold_seconds:
                        idle_minutes = int(run_duration / 60)
                        lines.append(f"  [IDLE GAP: ~{idle_minutes}m — same window unchanged]")
                except (ValueError, TypeError):
                    pass
            prev_app = app
            prev_title = title
            start_ts = ts
            try:
                start_dt = datetime.fromisoformat(ts)
            except (ValueError, TypeError):
                start_dt = None

    # Add last entry
    if prev_app and start_ts:
        lines.append(f"[{start_ts}] {prev_app}: {prev_title}")

    return "\n".join(lines)


def select_screenshots(screenshots: list[str], max_count: int = 20) -> list[str]:
    """Select representative screenshots, evenly distributed."""
    if len(screenshots) <= max_count:
        return screenshots

    step = len(screenshots) / max_count
    return [screenshots[int(i * step)] for i in range(max_count)]


def encode_screenshot(path: str) -> dict | None:
    """Encode a screenshot as base64 for the Claude API."""
    try:
        filepath = Path(path)
        if not filepath.exists():
            return None
        data = filepath.read_bytes()
        b64 = base64.standard_b64encode(data).decode("utf-8")
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": b64,
            },
        }
    except Exception:
        return None


def _build_matters_context(matters: list[dict]) -> str:
    """Build a context string describing active matters for the summarizer prompt."""
    if not matters:
        return ""

    billable = [m for m in matters if m.get("billing_type") != "non-billable"]
    non_billable = [m for m in matters if m.get("billing_type") == "non-billable"]

    lines = []
    if billable:
        lines.append("\nActive client matters (use these to add specificity to narratives):")
        for m in billable:
            keywords = m.get("keywords", [])
            kw_str = f" (keywords: {', '.join(keywords)})" if keywords else ""
            lines.append(f"- {m['name']}{kw_str}")

    if non_billable:
        lines.append("\nNon-billable internal matters (for admin, training, business development, pro bono):")
        for m in non_billable:
            keywords = m.get("keywords", [])
            kw_str = f" (keywords: {', '.join(keywords)})" if keywords else ""
            lines.append(f"- {m['name']}{kw_str}")

    return "\n".join(lines)


async def summarize_session(
    window_entries: list[dict],
    screenshots: list[str],
    start_time: str,
    end_time: str,
    elapsed_seconds: int = 0,
    matters: list[dict] = None,
) -> dict:
    """Call Claude to generate a session summary.

    Args:
        matters: Optional list of active matters to include in prompt context.
    """
    client = anthropic.Anthropic()

    timeline = build_timeline(window_entries)
    selected = select_screenshots(screenshots)

    # Build the message content
    content: list[dict] = []

    active_time_line = ""
    if elapsed_seconds > 0:
        active_minutes = elapsed_seconds // 60
        active_time_line = f"\nActive work time: {active_minutes} minutes (excludes idle/sleep pauses)\n"

    matters_context = _build_matters_context(matters or [])

    content.append({
        "type": "text",
        "text": f"Session: {start_time} to {end_time}{active_time_line}\nWindow Activity Timeline:\n{timeline}{matters_context}",
    })

    # Add screenshots
    for path in selected:
        img = encode_screenshot(path)
        if img:
            content.append(img)

    if selected:
        content.append({
            "type": "text",
            "text": f"I've included {len(selected)} screenshots from this session. Use them to add context to your analysis.",
        })

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )

    # Parse JSON response
    response_text = message.content[0].text.strip()

    # Handle potential markdown code blocks
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1])

    return json.loads(response_text)
