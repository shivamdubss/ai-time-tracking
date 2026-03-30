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
      "category": "Document Drafting"
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
- Narratives must "tell a story" so the client understands what was done and why it mattered to their case
- Format: action verb + specific work product + purpose or connection to case strategy
- Good narratives:
  "Researched case law on scope of discovery obligations to support motion to compel production of financial records in Smith v. Jones"
  "Reviewed and annotated opposing counsel's expert report to identify inconsistencies for cross-examination preparation"
  "Drafted correspondence to client summarizing settlement offer terms and recommending next steps"
  "Attended case management conference to set discovery schedule and address outstanding motion timelines"
- Bad narratives (would fail billing review):
  "Research" — no topic, no purpose
  "Reviewed documents" — which documents, for what purpose?
  "Correspondence with client" — about what?
  "Attend court" — what hearing, what purpose?
  "Worked on case" — completely generic
- Scale narrative detail to time spent: entries under 12 min need one concise clause; entries 12-60 min should include what was done and why; entries over 60 min should include specific sub-tasks or progression of work to justify the time
- Write narratives as if the client will read them on their bill — avoid app names, file paths, internal jargon, and technical references
- When work relates to a specific matter, connect the activity to the matter's purpose or current phase (not just "Drafted motion" but "Drafted motion to compel to advance discovery deadlines in [Matter Name]")
- Context is an internal-only field for matter-matching — briefly describe the work type (e.g., "drafting motion to compel", "researching case law"). Put all billing-quality detail in the narrative, not the context
- Group related activities by app (e.g., multiple Word windows = one activity)
- Summary should be 1-2 sentences, specific about what was accomplished
"""


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
        lines.append("\nActive client matters (use these to connect narratives to specific case work — reference the matter name and relate the activity to the matter's current phase or purpose):")
        for m in billable:
            keywords = m.get("keywords", [])
            kw_str = f" (keywords: {', '.join(keywords)})" if keywords else ""
            notes = m.get("notes", "")
            notes_str = f" — {notes}" if notes else ""
            lines.append(f"- {m['name']}{kw_str}{notes_str}")

    if non_billable:
        lines.append("\nNon-billable internal matters (for admin, training, business development, pro bono):")
        for m in non_billable:
            keywords = m.get("keywords", [])
            kw_str = f" (keywords: {', '.join(keywords)})" if keywords else ""
            notes = m.get("notes", "")
            notes_str = f" — {notes}" if notes else ""
            lines.append(f"- {m['name']}{kw_str}{notes_str}")

    return "\n".join(lines)


SUPABASE_FUNCTION_URL = os.getenv("SUPABASE_FUNCTION_URL", "")  # e.g. https://xyz.supabase.co/functions/v1/summarize


async def _summarize_via_edge_function(
    timeline: str,
    screenshots_b64: list[str],
    start_time: str,
    end_time: str,
    elapsed_seconds: int,
    matters_context: str,
    access_token: str,
) -> dict:
    """Call the Supabase Edge Function to summarize (proxies to Anthropic)."""
    import httpx

    # Batch screenshots into chunks of ~12 to stay under 6MB body limit
    BATCH_SIZE = 12
    all_activities = []
    all_categories = []
    summary_parts = []

    for i in range(0, max(1, len(screenshots_b64)), BATCH_SIZE):
        batch = screenshots_b64[i:i + BATCH_SIZE]
        payload = {
            "window_entries": timeline,
            "screenshots_base64": batch,
            "start_time": start_time,
            "end_time": end_time,
            "elapsed_seconds": elapsed_seconds,
            "matters_context": matters_context,
            "system_prompt": SYSTEM_PROMPT,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                SUPABASE_FUNCTION_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            result = resp.json()

        all_activities.extend(result.get("activities", []))
        all_categories.extend(result.get("categories", []))
        if result.get("summary"):
            summary_parts.append(result["summary"])

    # Merge categories by name
    merged_categories: dict[str, int] = {}
    for cat in all_categories:
        name = cat.get("name", "")
        merged_categories[name] = merged_categories.get(name, 0) + cat.get("minutes", 0)

    total_minutes = sum(merged_categories.values()) or 1
    categories = [
        {"name": name, "minutes": mins, "percentage": round(mins / total_minutes * 100)}
        for name, mins in merged_categories.items()
    ]

    return {
        "summary": " ".join(summary_parts) if summary_parts else "Session summarized.",
        "categories": categories,
        "activities": all_activities,
    }


async def summarize_session(
    window_entries: list[dict],
    screenshots: list[str],
    start_time: str,
    end_time: str,
    elapsed_seconds: int = 0,
    matters: list[dict] = None,
    access_token: str = "",
) -> dict:
    """Call Claude to generate a session summary.

    Uses the Supabase Edge Function if configured, otherwise calls Anthropic directly.
    """
    timeline = build_timeline(window_entries)
    selected = select_screenshots(screenshots)
    matters_context = _build_matters_context(matters or [])

    # If Supabase Edge Function is configured, use it
    if SUPABASE_FUNCTION_URL and access_token:
        screenshots_b64 = []
        for path in selected:
            img = encode_screenshot(path)
            if img:
                screenshots_b64.append(img["source"]["data"])

        return await _summarize_via_edge_function(
            timeline, screenshots_b64, start_time, end_time,
            elapsed_seconds, matters_context, access_token,
        )

    # Otherwise, call Anthropic directly (local dev / no Supabase)
    client = anthropic.Anthropic()

    content: list[dict] = []

    active_time_line = ""
    if elapsed_seconds > 0:
        active_minutes = elapsed_seconds // 60
        active_time_line = f"\nActive work time: {active_minutes} minutes (excludes idle/sleep pauses)\n"

    content.append({
        "type": "text",
        "text": f"Session: {start_time} to {end_time}{active_time_line}\nWindow Activity Timeline:\n{timeline}{matters_context}",
    })

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

    response_text = message.content[0].text.strip()

    if response_text.startswith("```"):
        lines = response_text.split("\n")
        response_text = "\n".join(lines[1:-1])

    return json.loads(response_text)
