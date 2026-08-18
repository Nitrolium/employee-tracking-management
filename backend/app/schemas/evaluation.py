from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class EvaluationBase(BaseModel):
    employee_id: int
    period_start: datetime
    period_end: datetime
    performance_score: float
    manager_comments: Optional[str] = None

class EvaluationCreate(EvaluationBase):
    pass

class EvaluationResponse(EvaluationBase):
    id: int
    manager_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class EmployeeReport(BaseModel):
    employee_id: int
    employee_name: str
    period_start: datetime
    period_end: datetime
    
    # Task metrics
    tasks_assigned: int
    tasks_completed: int
    
    # Activity metrics
    total_active_minutes: int
    total_idle_minutes: int
    
    # Submission metrics
    total_submissions: int
    approved_submissions: int
    rejected_submissions: int
