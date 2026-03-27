from fastapi import APIRouter

from .sessions import get_manager

router = APIRouter(tags=["status"])


@router.get("/api/status")
async def get_status():
    manager = get_manager()

    if manager.is_tracking:
        return {
            "status": "paused" if manager.is_paused else "tracking",
            "elapsed_seconds": manager.elapsed_seconds,
            "session_id": manager.current_session_id,
        }

    return {
        "status": "idle",
        "elapsed_seconds": 0,
        "session_id": None,
    }
