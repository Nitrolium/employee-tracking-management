from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Time, JSON, Date
from sqlalchemy.orm import relationship
from .base import Base

class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    working_days = Column(JSON, nullable=False) # e.g. [1, 2, 3, 4, 5]
    break_duration_minutes = Column(Integer, default=0)
    effective_date = Column(Date, nullable=False)
    manager_id = Column(Integer, ForeignKey("managers.id"), nullable=False)
    
    manager = relationship("Manager", backref="shifts")
    assignments = relationship("ShiftAssignment", back_populates="shift")

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    shift = relationship("Shift", back_populates="assignments")
    employee = relationship("Employee", backref="shift_assignments")
    team = relationship("Team", backref="shift_assignments")
