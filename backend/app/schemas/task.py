from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.task import TaskStatusEnum

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    deadline: Optional[datetime] = None
    expected_duration: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    status: TaskStatusEnum

class TaskResponse(TaskBase):
    id: int
    manager_id: int
    status: TaskStatusEnum
    created_at: datetime
    class Config:
        from_attributes = True

class TaskAssignmentBase(BaseModel):
    task_id: int
    employee_id: Optional[int] = None
    team_id: Optional[int] = None

class TaskAssignmentCreate(TaskAssignmentBase):
    pass

class TaskAssignmentResponse(TaskAssignmentBase):
    id: int
    class Config:
        from_attributes = True
