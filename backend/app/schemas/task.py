from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.task import TaskStatusEnum
from app.schemas.file import FileResponse

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    deadline: Optional[datetime] = None
    expected_duration: Optional[int] = None

class TaskCreate(TaskBase):
    file_ids: Optional[List[int]] = []
    assigned_employee_ids: Optional[List[int]] = []
    assigned_team_ids: Optional[List[int]] = []

class TaskUpdate(BaseModel):
    status: Optional[TaskStatusEnum] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None

class TaskAssignmentBase(BaseModel):
    task_id: int
    employee_id: Optional[int] = None
    team_id: Optional[int] = None

class TaskAssignmentCreate(TaskAssignmentBase):
    pass

class TaskAssignmentResponse(TaskAssignmentBase):
    id: int
    employee_name: Optional[str] = None
    team_name: Optional[str] = None
    class Config:
        from_attributes = True

class TaskResponse(TaskBase):
    id: int
    manager_id: int
    status: TaskStatusEnum
    created_at: datetime
    files: List[FileResponse] = []
    assignments: List[TaskAssignmentResponse] = []
    assigned_to_name: Optional[str] = None
    class Config:
        from_attributes = True

