from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ..database import get_default_hourly_rate, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class DefaultRateRequest(BaseModel):
    rate: Optional[float] = None


@router.get("/default-hourly-rate")
async def get_default_rate():
    return {"rate": get_default_hourly_rate()}


@router.put("/default-hourly-rate")
async def set_default_rate(req: DefaultRateRequest):
    set_setting("default_hourly_rate", str(req.rate) if req.rate is not None else None)
    return {"rate": req.rate}
