import base64
import json
import os
from pathlib import Path

import anthropic

MODEL = os.getenv("TIMETRACK_MODEL", "claude-sonnet-4-20250514")


SYSTEM_PROMPT = """You are an AI assistant that analyzes work sessions. Given a chronological log of window activity and optional screenshots, produce a structured JSON summary.

Return ONLY valid JSON with this exact schema:
{
  "summary": "High-level 1-2 sentence overview of the session.",
  "categories": [
    { "name": "Coding", "minutes": 45, "percentage": 38 },
    { "name": "Communication", "minutes": 30, "percentage": 25 }
  ],
  "activities": [
    {
      "app": "VS Code",
      "context": "project-name / src",
      "minutes": 40,
      "narrative": "Specific description of what was done in this app."
    }
  ]
}

Rules:
- Categories must be one of: Coding, Communication, Research, Meetings, Browsing
- Percentages must sum to 100
- Minutes should be approximate based on the time spent in each app
- Narratives should be specific and descriptive, not vague
- Context should include the most relevant detail from window titles (repo name, channel, URL domain)
- Group related activities by app (e.g., multiple VS Code windows = one activity)
- summary should be 1-2 sentences, specific about what was accomplished"""


def build_timeline(window_entries: list[dict]) -> str:
    """Convert raw window entries into a readable timeline."""
    if not window_entries:
        return "No window activity recorded."

    lines = []
    prev_app = None
    prev_title = None
    start_ts = None

    for entry in window_entries:
        app = entry.get("app", "Unknown")
        title = entry.get("title", "")
        ts = entry.get("timestamp", "")

        if app != prev_app or title != prev_title:
            if prev_app and start_ts:
                lines.append(f"[{start_ts}] {prev_app}: {prev_title}")
            prev_app = app
            prev_title = title
            start_ts = ts

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


async def summarize_session(
    window_entries: list[dict],
    screenshots: list[str],
    start_time: str,
    end_time: str,
) -> dict:
    """Call Claude to generate a session summary."""
    client = anthropic.Anthropic()

    timeline = build_timeline(window_entries)
    selected = select_screenshots(screenshots)

    # Build the message content
    content: list[dict] = []

    content.append({
        "type": "text",
        "text": f"Session: {start_time} to {end_time}\n\nWindow Activity Timeline:\n{timeline}",
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
