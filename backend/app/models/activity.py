import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class ActivityStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    IDLE = "IDLE"
    LOCKED = "LOCKED"
    OFFLINE = "OFFLINE"
    OUTSIDE_SHIFT = "OUTSIDE_SHIFT"
    TRACKING_DISABLED = "TRACKING_DISABLED"

class ActivitySession(Base):
    __tablename__ = "activity_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(ActivityStatusEnum), nullable=False)
    
    employee = relationship("Employee", backref="activity_sessions")
    shift = relationship("Shift", backref="activity_sessions")

class ActivitySummary(Base):
    __tablename__ = "activity_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False) # Start of the chunk
    duration_minutes = Column(Integer, nullable=False, default=5)
    active_duration_seconds = Column(Integer, nullable=False, default=0)
    idle_duration_seconds = Column(Integer, nullable=False, default=0)
    mouse_event_count = Column(Integer, nullable=False, default=0)
    keyboard_event_count = Column(Integer, nullable=False, default=0)
    
    employee = relationship("Employee", backref="activity_summaries")
    app_usages = relationship("ApplicationUsage", back_populates="summary")

class ApplicationUsage(Base):
    __tablename__ = "application_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    summary_id = Column(Integer, ForeignKey("activity_summaries.id"), nullable=False)
    app_name = Column(String, nullable=False)
    window_title = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=0)
    
    employee = relationship("Employee")
    summary = relationship("ActivitySummary", back_populates="app_usages")
