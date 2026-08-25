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
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
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

class HeartbeatRequest(BaseModel):
    status: str = "ACTIVE" # ACTIVE, IDLE, IN_SHIFT, TRACKING_STARTED, TRACKING_STOPPED
    window_title: Optional[str] = None
    app_name: Optional[str] = None
    idle_seconds: Optional[int] = 0
    active_seconds: Optional[int] = 0

class LiveEmployeeStatus(BaseModel):
    employee_id: int
    employee_name: str
    email: str
    status: str
    current_app: Optional[str] = None
    window_title: Optional[str] = None
    is_online: bool = False
    is_tracking: bool = False
    last_heartbeat: Optional[datetime] = None
    today_active_seconds: int = 0
    today_idle_seconds: int = 0
    focus_score_today: float = 100.0
    keystrokes_today: int = 0
    mouse_clicks_today: int = 0
    activity_intensity: str = "OFFLINE"
    app_category: str = "General"
    assigned_shift_name: Optional[str] = None
    shift_start_time: Optional[str] = None
    shift_end_time: Optional[str] = None
    shift_progress_percent: float = 0.0

class AppBreakdownItem(BaseModel):
    app_name: str
    duration_seconds: int
    percentage: float
    category: str = "General"

class TimelineBucket(BaseModel):
    time_label: str
    active_seconds: int
    idle_seconds: int

class PastShiftActivityResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    employee_email: str
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    date: str
    clock_in_time: str
    clock_out_time: Optional[str] = None
    is_ongoing: bool = False
    total_duration_seconds: int = 0
    active_duration_seconds: int = 0
    idle_duration_seconds: int = 0
    break_duration_seconds: int = 0
    focus_score: float = 0.0
    mouse_event_count: int = 0
    keyboard_event_count: int = 0
    punctuality_status: str = "ON_TIME"
    top_applications: List[AppBreakdownItem] = []
    timeline: List[TimelineBucket] = []


