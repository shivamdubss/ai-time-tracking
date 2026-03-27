from fastapi import APIRouter, Query

from ..database import (
    get_analytics_summary,
    get_analytics_trend,
    get_analytics_by_matter,
    get_analytics_by_category,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
):
    return get_analytics_summary(start_date, end_date)


@router.get("/trend")
async def analytics_trend(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    granularity: str = Query("day", description="day|week|month"),
):
    return {"data": get_analytics_trend(start_date, end_date, granularity)}


@router.get("/by-matter")
async def analytics_by_matter(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    limit: int = Query(10),
):
    return get_analytics_by_matter(start_date, end_date, limit)


@router.get("/by-category")
async def analytics_by_category(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
):
    return {"data": get_analytics_by_category(start_date, end_date)}
