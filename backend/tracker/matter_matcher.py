"""Post-summarization matter matching engine.

Matches activities to matters using keyword substring matching against
the activity's app name and context (window title).

Algorithm:
1. For each activity, check app + context against all active matter keywords
2. Case-insensitive substring match. Matter name is an implicit keyword.
3. Single match -> assign
4. Multiple matches -> longest keyword wins. Equal length -> most recently updated matter.
5. No match -> matter_id = None (Unassigned)
"""
from typing import Optional


def match_activities_to_matters(
    activities: list[dict],
    matters: list[dict],
) -> list[dict]:
    """Match each activity to the best-fitting matter based on keywords.

    Args:
        activities: List of activity dicts with 'app' and 'context' fields
        matters: List of matter dicts with 'id', 'name', 'keywords', 'updated_at' fields

    Returns:
        The same activities list with 'matter_id' set on matched activities
    """
    if not matters:
        return activities

    for activity in activities:
        match = _find_best_match(activity, matters)
        if match:
            activity["matter_id"] = match["id"]

    return activities


def _find_best_match(activity: dict, matters: list[dict]) -> Optional[dict]:
    """Find the best matching matter for a single activity."""
    search_text = f"{activity.get('app', '')} {activity.get('context', '')}".lower()

    if not search_text.strip():
        return None

    candidates = []

    for matter in matters:
        if matter.get("status") != "active":
            continue

        # Build keyword list: explicit keywords + matter name
        keywords = list(matter.get("keywords", []))
        keywords.append(matter.get("name", ""))

        best_keyword_len = 0
        for keyword in keywords:
            if not keyword:
                continue
            if keyword.lower() in search_text:
                best_keyword_len = max(best_keyword_len, len(keyword))

        if best_keyword_len > 0:
            candidates.append((matter, best_keyword_len))

    if not candidates:
        return None

    if len(candidates) == 1:
        return candidates[0][0]

    # Sort by keyword length (desc), then by updated_at (desc) for tiebreak
    candidates.sort(key=lambda x: (x[1], x[0].get("updated_at", "")), reverse=True)
    return candidates[0][0]
