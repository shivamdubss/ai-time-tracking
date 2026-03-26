import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..database import (
    create_session,
    get_session,
    get_sessions_by_date,
    delete_session,
    update_session,
)
from ..tracker.session_manager import SessionManager
from ..summarizer import summarize_session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Shared session manager
manager = SessionManager()


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
):
    """Summarize session with Claude, store result, clean up temp data."""
    from ..ws import broadcast_ws

    try:
        summary_data = await summarize_session(
            window_entries=window_entries,
            screenshots=screenshots,
            start_time=start_time,
            end_time=end_time,
        )

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
        # On failure, still mark as completed with error info
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
        # Always clean up temp data
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
