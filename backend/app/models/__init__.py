from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .base import Base

class RoleEnum(enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id"), primary_key=True),
    Column("employee_id", Integer, ForeignKey("employees.id"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    manager_profile = relationship("Manager", back_populates="user", uselist=False)
    employee_profile = relationship("Employee", back_populates="user", uselist=False)

class Manager(Base):
    __tablename__ = "managers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    department = Column(String)
    
    user = relationship("User", back_populates="manager_profile")
    teams = relationship("Team", back_populates="manager")
    employees = relationship("Employee", back_populates="manager")

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    manager_id = Column(Integer, ForeignKey("managers.id"))
    
    user = relationship("User", back_populates="employee_profile")
    manager = relationship("Manager", back_populates="employees")
    teams = relationship("Team", secondary=team_members, back_populates="members")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    manager_id = Column(Integer, ForeignKey("managers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    manager = relationship("Manager", back_populates="teams")
    members = relationship("Employee", secondary=team_members, back_populates="teams")

from .shift import Shift, ShiftAssignment
from .task import Task, TaskAssignment, TaskStatusEnum
from .file import FileRecord, TaskFile, FileAssociationType
from .submission import Submission, SubmissionFile, SubmissionStatusEnum
