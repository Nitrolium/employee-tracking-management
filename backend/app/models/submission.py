import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class SubmissionStatusEnum(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    status = Column(Enum(SubmissionStatusEnum), default=SubmissionStatusEnum.PENDING)
    comment = Column(Text, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_by = Column(Integer, ForeignKey("managers.id"), nullable=True)
    manager_feedback = Column(Text, nullable=True)
    
    task = relationship("Task", back_populates="submissions")
    employee = relationship("Employee", backref="submissions")
    files = relationship("SubmissionFile", back_populates="submission")
    reviewer = relationship("Manager", backref="reviewed_submissions")

class SubmissionFile(Base):
    __tablename__ = "submission_files"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    
    submission = relationship("Submission", back_populates="files")
    file = relationship("FileRecord")
