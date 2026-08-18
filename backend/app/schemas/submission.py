from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.submission import SubmissionStatusEnum

class SubmissionBase(BaseModel):
    task_id: int
    comment: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionReview(BaseModel):
    status: SubmissionStatusEnum
    manager_feedback: Optional[str] = None

class SubmissionResponse(SubmissionBase):
    id: int
    employee_id: int
    status: SubmissionStatusEnum
    version: int
    submitted_at: datetime
    reviewed_by: Optional[int] = None
    manager_feedback: Optional[str] = None
    class Config:
        from_attributes = True
