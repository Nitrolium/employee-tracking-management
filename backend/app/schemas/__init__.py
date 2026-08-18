from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import datetime

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: RoleEnum

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[RoleEnum] = None

# Manager Schemas
class ManagerBase(BaseModel):
    full_name: str
    department: Optional[str] = None

class ManagerCreate(ManagerBase):
    user: UserCreate

class ManagerResponse(ManagerBase):
    id: int
    user_id: int
    user: UserResponse
    class Config:
        from_attributes = True

# Employee Schemas
class EmployeeBase(BaseModel):
    full_name: str

class EmployeeCreate(EmployeeBase):
    user: UserCreate
    manager_id: Optional[int] = None

class EmployeeResponse(EmployeeBase):
    id: int
    user_id: int
    manager_id: Optional[int] = None
    user: UserResponse
    class Config:
        from_attributes = True

# Team Schemas
class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: int
    manager_id: int
    created_at: datetime
    members: List[EmployeeResponse] = []
    class Config:
        from_attributes = True

from .shift import ShiftCreate, ShiftResponse, ShiftAssignmentCreate, ShiftAssignmentResponse
from .task import TaskCreate, TaskUpdate, TaskResponse, TaskAssignmentCreate, TaskAssignmentResponse
from .file import FileCreate, FileResponse
from .submission import SubmissionCreate, SubmissionReview, SubmissionResponse
