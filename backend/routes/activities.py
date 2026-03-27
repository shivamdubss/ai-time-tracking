import csv
import io
import uuid
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from ..database import (
    get_activities_for_session, update_activity, get_activity, get_session,
    resolve_rate, get_matter, insert_activity, delete_activity,
    get_next_sort_order, get_activities_for_export,
    get_sessions_by_date, create_session, update_session,
)

router = APIRouter(tags=["activities"])


def utbms_to_category(code: str | None) -> str:
    """Derive a legal category from a UTBMS code."""
    if not code:
        return "Administrative"
    prefix = code[0]
    try:
        num = int(code[1:])
    except ValueError:
        return "Administrative"
    if prefix == "L":
        if 100 <= num <= 190:
            return "Case Review"
        if 200 <= num <= 250:
            return "Document Drafting"
        if 300 <= num <= 340:
            return "Case Review"
        if 400 <= num <= 440:
            return "Court & Hearings"
        if 500 <= num <= 520:
            return "Court & Hearings"
    if prefix == "A":
        return {
            "A101": "Court & Hearings",
            "A102": "Client Communication",
            "A103": "Document Drafting",
            "A104": "Legal Research",
            "A106": "Administrative",
        }.get(code, "Administrative")
    return "Administrative"


class UpdateActivityRequest(BaseModel):
    matter_id: Optional[str] = None
    narrative: Optional[str] = None
    billable: Optional[bool] = None
    category: Optional[str] = None
    minutes: Optional[int] = None
    activity_code: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class CreateActivityRequest(BaseModel):
    app: str = "Manual Entry"
    context: str = ""
    minutes: int = 6
    narrative: str = ""
    category: str = "Administrative"
    matter_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    activity_code: Optional[str] = None


class ManualEntryRequest(BaseModel):
    date: str  # YYYY-MM-DD
    app: str = "Manual Entry"
    context: str = "Offline work"
    minutes: int = 6
    narrative: str = ""
    category: str = "Administrative"
    matter_id: Optional[str] = None
    activity_code: Optional[str] = None


@router.post("/api/manual-entry")
async def create_manual_entry(req: ManualEntryRequest):
    """Create a manual time entry for a given date, auto-creating a session if needed."""
    sessions = get_sessions_by_date(req.date)
    if sessions:
        session_id = sessions[0]["id"]
    else:
        session_id = str(uuid.uuid4())[:8]
        start_time = f"{req.date}T09:00:00"
        create_session(session_id, start_time)
        update_session(session_id, end_time=start_time, status="completed", summary="Manual entries")

    sort_order = get_next_sort_order(session_id)

    billable = True
    effective_rate = None
    if req.matter_id:
        matter = get_matter(req.matter_id)
        if matter and matter.get("billing_type") == "non-billable":
            billable = False
        else:
            effective_rate = resolve_rate(req.matter_id)

    category = utbms_to_category(req.activity_code) if req.activity_code else req.category

    result = insert_activity(
        session_id=session_id,
        app=req.app,
        context=req.context,
        minutes=req.minutes,
        narrative=req.narrative,
        category=category,
        matter_id=req.matter_id,
        billable=billable,
        effective_rate=effective_rate,
        sort_order=sort_order,
        activity_code=req.activity_code,
    )
    return result


@router.get("/api/sessions/{session_id}/activities")
async def list_activities(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return get_activities_for_session(session_id)


@router.post("/api/sessions/{session_id}/activities")
async def create_activity_endpoint(session_id: str, req: CreateActivityRequest):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    sort_order = get_next_sort_order(session_id)

    billable = True
    effective_rate = None
    if req.matter_id:
        matter = get_matter(req.matter_id)
        if matter and matter.get("billing_type") == "non-billable":
            billable = False
        else:
            effective_rate = resolve_rate(req.matter_id)

    category = utbms_to_category(req.activity_code) if req.activity_code else req.category

    result = insert_activity(
        session_id=session_id,
        app=req.app,
        context=req.context,
        minutes=req.minutes,
        narrative=req.narrative,
        category=category,
        matter_id=req.matter_id,
        billable=billable,
        effective_rate=effective_rate,
        sort_order=sort_order,
        start_time=req.start_time,
        end_time=req.end_time,
        activity_code=req.activity_code,
    )
    return result


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
    if req.category is not None:
        updates["category"] = req.category
    if req.minutes is not None:
        if req.minutes < 0:
            raise HTTPException(status_code=400, detail="Minutes must be >= 0")
        updates["minutes"] = req.minutes
    if req.activity_code is not None:
        updates["activity_code"] = req.activity_code
        updates["category"] = utbms_to_category(req.activity_code)
    if req.start_time is not None:
        updates["start_time"] = req.start_time
    if req.end_time is not None:
        updates["end_time"] = req.end_time

    # Special case: allow explicitly setting matter_id to null for "Unassigned"
    if "matter_id" not in updates and req.model_dump().get("matter_id") is None and "matter_id" in req.model_fields_set:
        updates["matter_id"] = None

    if not updates:
        return existing

    # When matter changes, recalculate the effective rate and billable status
    if "matter_id" in updates:
        new_matter_id = updates["matter_id"]
        if new_matter_id:
            matter = get_matter(new_matter_id)
            if matter and matter.get("billing_type") == "non-billable":
                updates["billable"] = False
                updates["effective_rate"] = None
            else:
                updates["billable"] = True
                updates["effective_rate"] = resolve_rate(new_matter_id)
        else:
            # Unassigned: revert to default billable, no rate
            updates["billable"] = True
            updates["effective_rate"] = None

    result = update_activity(activity_id, **updates)
    if not result:
        raise HTTPException(status_code=500, detail="Update failed")
    return result


@router.delete("/api/activities/{activity_id}")
async def delete_activity_endpoint(activity_id: str):
    existing = get_activity(activity_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")
    delete_activity(activity_id)
    return {"deleted": True}


@router.get("/api/export")
async def export_timesheet(date: str = Query(...), format: str = Query("csv")):
    rows = get_activities_for_export(date)

    if format != "csv":
        raise HTTPException(status_code=400, detail="Only 'csv' format is currently supported")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Client", "Matter", "Matter Number", "Activity Code",
        "Category", "Hours", "Narrative", "Rate", "Value",
    ])

    for r in rows:
        hours = round((r.get("minutes") or 0) / 60, 1)
        hours = max(hours, 0.1) if (r.get("minutes") or 0) > 0 else 0.0
        rate = r.get("effective_rate") or ""
        value = round(hours * r["effective_rate"], 2) if r.get("effective_rate") else ""
        writer.writerow([
            date,
            r.get("client_name") or "Unassigned",
            r.get("matter_name") or "Unassigned",
            r.get("matter_number") or "",
            r.get("activity_code") or "",
            r.get("category") or "",
            hours,
            r.get("narrative") or "",
            rate,
            value,
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=timesheet-{date}.csv"},
    )
