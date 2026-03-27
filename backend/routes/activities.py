from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..database import (
    get_activities_for_session, update_activity, get_activity, get_session,
)

router = APIRouter(tags=["activities"])


class UpdateActivityRequest(BaseModel):
    matter_id: Optional[str] = None
    narrative: Optional[str] = None
    billable: Optional[bool] = None


@router.get("/api/sessions/{session_id}/activities")
async def list_activities(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return get_activities_for_session(session_id)


@router.patch("/api/activities/{activity_id}")
async def update_activity_endpoint(activity_id: str, req: UpdateActivityRequest):
    existing = get_activity(activity_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")

    updates = {}
    if req.matter_id is not None:
        updates["matter_id"] = req.matter_id
    if req.narrative is not None:
        updates["narrative"] = req.narrative
    if req.billable is not None:
        updates["billable"] = req.billable
    # Special case: allow explicitly setting matter_id to null for "Unassigned"
    if "matter_id" not in updates and req.model_dump().get("matter_id") is None and "matter_id" in req.model_fields_set:
        updates["matter_id"] = None

    if not updates:
        return existing

    result = update_activity(activity_id, **updates)
    if not result:
        raise HTTPException(status_code=500, detail="Update failed")
    return result
