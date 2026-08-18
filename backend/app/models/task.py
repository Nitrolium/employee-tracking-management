import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class TaskStatusEnum(enum.Enum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="Medium")
    deadline = Column(DateTime(timezone=True), nullable=True)
    expected_duration = Column(Integer, nullable=True) # minutes
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.ASSIGNED)
    manager_id = Column(Integer, ForeignKey("managers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    manager = relationship("Manager", backref="tasks_created")
    assignments = relationship("TaskAssignment", back_populates="task")
    files = relationship("TaskFile", back_populates="task")
    submissions = relationship("Submission", back_populates="task")

class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    task = relationship("Task", back_populates="assignments")
    employee = relationship("Employee", backref="task_assignments")
    team = relationship("Team", backref="task_assignments")
