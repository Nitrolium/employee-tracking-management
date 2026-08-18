from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.activity import ActivityStatusEnum

class AppUsageBase(BaseModel):
    app_name: str
    window_title: Optional[str] = None
    duration_seconds: int

class ActivitySummaryBase(BaseModel):
    timestamp: datetime
    duration_minutes: int
    active_duration_seconds: int
    idle_duration_seconds: int
    mouse_event_count: int
    keyboard_event_count: int
    app_usages: List[AppUsageBase] = []

class ActivitySyncRequest(BaseModel):
    summaries: List[ActivitySummaryBase]

class ActivitySummaryResponse(ActivitySummaryBase):
    id: int
    employee_id: int
    class Config:
        from_attributes = True

class ActivitySessionBase(BaseModel):
    shift_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    status: ActivityStatusEnum

class ActivitySessionResponse(ActivitySessionBase):
    id: int
    employee_id: int
    class Config:
        from_attributes = True
