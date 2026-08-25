from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .base import Base

class FileAssociationType(str, enum.Enum):
    TASK = "TASK"
    TEAM = "TEAM"
    EMPLOYEE = "EMPLOYEE"

class FileRecord(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class TaskFile(Base):
    __tablename__ = "task_files"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    
    task = relationship("Task", back_populates="files")
    file = relationship("FileRecord")
