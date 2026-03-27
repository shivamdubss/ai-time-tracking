from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..database import (
    create_matter, get_matter, get_all_matters, update_matter, delete_matter,
)
router = APIRouter(prefix="/api/matters", tags=["matters"])


class CreateMatterRequest(BaseModel):
    client_id: str
    name: str
    matter_number: Optional[str] = None
    practice_area: Optional[str] = None
    billing_type: str = "hourly"
    hourly_rate: Optional[float] = None
    keywords: Optional[list[str]] = None
    key_people: Optional[list[dict]] = None
    team_members: Optional[list[dict]] = None
    notes: Optional[str] = None


class UpdateMatterRequest(BaseModel):
    name: Optional[str] = None
    matter_number: Optional[str] = None
    status: Optional[str] = None
    practice_area: Optional[str] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    keywords: Optional[list[str]] = None
    key_people: Optional[list[dict]] = None
    team_members: Optional[list[dict]] = None
    notes: Optional[str] = None


@router.get("")
async def list_matters(status: Optional[str] = None, client_id: Optional[str] = None):
    return get_all_matters(status=status, client_id=client_id)


@router.post("", status_code=201)
async def create_matter_endpoint(req: CreateMatterRequest):
    try:
        return create_matter(
            client_id=req.client_id,
            name=req.name,
            matter_number=req.matter_number,
            practice_area=req.practice_area,
            billing_type=req.billing_type,
            hourly_rate=req.hourly_rate,
            keywords=req.keywords,
            key_people=req.key_people,
            team_members=req.team_members,
            notes=req.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{matter_id}")
async def get_matter_endpoint(matter_id: str):
    matter = get_matter(matter_id)
    if not matter:
        raise HTTPException(status_code=404, detail="Matter not found")
    return matter


@router.patch("/{matter_id}")
async def update_matter_endpoint(matter_id: str, req: UpdateMatterRequest):
    existing = get_matter(matter_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Matter not found")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        return existing
    return update_matter(matter_id, **updates)


@router.delete("/{matter_id}")
async def delete_matter_endpoint(matter_id: str):
    success, err = delete_matter(matter_id)
    if not success and err:
        raise HTTPException(status_code=409, detail=err)
    if not success:
        raise HTTPException(status_code=404, detail="Matter not found")
    return {"deleted": True}
