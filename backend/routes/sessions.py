import asyncio
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..database import (
    create_session,
    get_session,
    get_sessions_by_date,
    delete_session,
    update_session,
    get_all_matters,
    insert_activity,
    resolve_rate,
)
from ..tracker.session_manager import SessionManager
from ..tracker.matter_matcher import match_activities_to_matters
from ..summarizer import summarize_session

logger = logging.getLogger("timetrack")

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Shared session manager
manager = SessionManager()


def _notify_state_change(new_status: str):
    """Bridge from sync SessionManager thread to async WebSocket broadcast."""
    from ..ws import broadcast_ws

    try:
        loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(
            asyncio.ensure_future,
            broadcast_ws({"type": "tracking_state", "status": new_status}),
        )
    except Exception:
        logger.debug("Could not broadcast state change", exc_info=True)


manager.set_state_change_callback(_notify_state_change)


def get_manager() -> SessionManager:
    return manager


@router.post("/start")
async def start_session():
    try:
        session_id = manager.start()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

    start_time = manager.start_time.isoformat()
    create_session(session_id, start_time)

    return {"id": session_id, "start_time": start_time, "status": "tracking"}


@router.post("/stop")
async def stop_session():
    try:
        result = manager.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

    session_id = result["session_id"]

    # Update session to processing
    update_session(
        session_id,
        end_time=result["end_time"],
        status="processing",
    )

    # Run summarization in background
    asyncio.create_task(
        _summarize_and_cleanup(
            session_id=session_id,
            window_entries=result["window_entries"],
            screenshots=result["screenshots"],
            start_time=result["start_time"],
            end_time=result["end_time"],
            temp_dir=result["temp_dir"],
            elapsed_seconds=result["elapsed_seconds"],
        )
    )

    return {"id": session_id, "status": "processing"}


async def _summarize_and_cleanup(
    session_id: str,
    window_entries: list,
    screenshots: list,
    start_time: str,
    end_time: str,
    temp_dir: str,
    elapsed_seconds: int = 0,
):
    """Summarize session with Claude, match to matters, store activities, clean up."""
    from ..ws import broadcast_ws

    try:
        # Get active matters for the prompt context
        active_matters = get_all_matters(status="active")

        summary_data = await summarize_session(
            window_entries=window_entries,
            screenshots=screenshots,
            start_time=start_time,
            end_time=end_time,
            elapsed_seconds=elapsed_seconds,
            matters=active_matters,
        )

        # Match activities to matters
        raw_activities = summary_data.get("activities", [])
        matched_activities = match_activities_to_matters(raw_activities, active_matters)

        # Insert activities into the normalized table with rate snapshots
        for i, act in enumerate(matched_activities):
            matter_id = act.get("matter_id")
            effective_rate = resolve_rate(matter_id) if matter_id else None

            insert_activity(
                session_id=session_id,
                app=act.get("app", "Unknown"),
                context=act.get("context", ""),
                minutes=act.get("minutes", 0),
                narrative=act.get("narrative", ""),
                category=act.get("category", ""),
                matter_id=matter_id,
                billable=True,
                effective_rate=effective_rate,
                sort_order=i,
            )

        # Update session (keep legacy JSON for backward compat during transition)
        update_session(
            session_id,
            status="completed",
            summary=summary_data.get("summary", ""),
            categories=summary_data.get("categories", []),
            activities=summary_data.get("activities", []),
        )

        await broadcast_ws({
            "type": "session_completed",
            "session_id": session_id,
        })

    except Exception as e:
        logger.error(f"Summarization failed for session {session_id}: {e}", exc_info=True)
        update_session(
            session_id,
            status="completed",
            summary=f"Summarization failed: {str(e)}",
        )
        await broadcast_ws({
            "type": "session_completed",
            "session_id": session_id,
        })

    finally:
        manager.cleanup(temp_dir)


@router.get("")
async def list_sessions(date: str | None = None):
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    sessions = get_sessions_by_date(date)
    return sessions


@router.get("/{session_id}")
async def get_session_detail(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}")
async def remove_session(session_id: str):
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}
