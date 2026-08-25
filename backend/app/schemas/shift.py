import re
from pydantic import BaseModel, field_validator
from typing import Optional, List, Union, Any
from datetime import time, date, datetime

def parse_flexible_time(v: Any) -> time:
    if isinstance(v, time):
        return v
    if isinstance(v, str):
        v = v.strip()
        # Direct ISO attempt e.g. "09:00:00" or "09:00"
        try:
            return time.fromisoformat(v)
        except Exception:
            pass
        # Common standard 12/24 hour formats
        for fmt in ("%I:%M %p", "%I:%M%p", "%I %p", "%I%p", "%H:%M:%S", "%H:%M", "%H"):
            try:
                dt = datetime.strptime(v, fmt)
                return dt.time()
            except ValueError:
                pass
        # Regex for single-digit hours like "9:00", "9:00:00"
        match = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", v)
        if match:
            h, m, s = match.groups()
            return time(hour=int(h), minute=int(m), second=int(s or 0))
    raise ValueError(f"Invalid time format: {v}. Please provide format like 09:00 or 17:00")

class ShiftBase(BaseModel):
    name: str
    start_time: time
    end_time: time
    working_days: Union[List[int], List[str], str] = [1, 2, 3, 4, 5]
    break_duration_minutes: int = 60
    effective_date: Optional[date] = None

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def validate_times(cls, v: Any) -> time:
        return parse_flexible_time(v)

    @field_validator("working_days", mode="before")
    @classmethod
    def parse_working_days(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v
        return v


class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(BaseModel):
    id: int
    name: str
    start_time: time
    end_time: time
    working_days: Any
    break_duration_minutes: int
    effective_date: date
    manager_id: int
    assignment_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ShiftAssignmentBase(BaseModel):
    shift_id: int
    employee_id: Optional[int] = None
    team_id: Optional[int] = None

class ShiftAssignmentCreate(ShiftAssignmentBase):
    pass

class ShiftAssignmentResponse(ShiftAssignmentBase):
    id: int
    employee_name: Optional[str] = None
    team_name: Optional[str] = None

    class Config:
        from_attributes = True

