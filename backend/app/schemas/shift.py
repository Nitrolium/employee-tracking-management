from pydantic import BaseModel
from typing import Optional, List
from datetime import time, date

class ShiftBase(BaseModel):
    name: str
    start_time: time
    end_time: time
    working_days: List[int]
    break_duration_minutes: int = 0
    effective_date: date

class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(ShiftBase):
    id: int
    manager_id: int
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
    class Config:
        from_attributes = True
