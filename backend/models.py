from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Category(BaseModel):
    name: str
    minutes: int
    percentage: int


class Activity(BaseModel):
    app: str
    context: str
    minutes: int
    narrative: str


class SessionSummary(BaseModel):
    summary: str
    categories: list[Category]
    activities: list[Activity]


class Session(BaseModel):
    id: str
    start_time: str
    end_time: Optional[str] = None
    status: str = "tracking"  # tracking | processing | completed
    summary: Optional[str] = None
    categories: list[Category] = []
    activities: list[Activity] = []
    created_at: str = ""


class StatusResponse(BaseModel):
    status: str  # idle | tracking | processing
    elapsed_seconds: int = 0
    session_id: Optional[str] = None
