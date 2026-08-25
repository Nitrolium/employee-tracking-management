from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.submission import SubmissionStatusEnum
from app.schemas.file import FileResponse

class SubmissionBase(BaseModel):
    task_id: int
    comment: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    file_ids: Optional[List[int]] = []

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
    files: List[FileResponse] = []
    employee_name: Optional[str] = None
    task_title: Optional[str] = None
    class Config:
        from_attributes = True

