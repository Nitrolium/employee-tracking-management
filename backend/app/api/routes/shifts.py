from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Shift, ShiftAssignment, User, Manager, Employee, RoleEnum
from app.schemas.shift import ShiftCreate, ShiftResponse, ShiftAssignmentCreate, ShiftAssignmentResponse

router = APIRouter()

@router.post("/", response_model=ShiftResponse)
async def create_shift(
    shift_in: ShiftCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        raise HTTPException(status_code=400, detail="Manager profile not found")

    new_shift = Shift(
        name=shift_in.name,
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        working_days=shift_in.working_days,
        break_duration_minutes=shift_in.break_duration_minutes,
        effective_date=shift_in.effective_date,
        manager_id=manager.id
    )
    db.add(new_shift)
    await db.commit()
    await db.refresh(new_shift)
    return new_shift

@router.post("/assign", response_model=ShiftAssignmentResponse)
async def assign_shift(
    assignment_in: ShiftAssignmentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    new_assignment = ShiftAssignment(
        shift_id=assignment_in.shift_id,
        employee_id=assignment_in.employee_id,
        team_id=assignment_in.team_id
    )
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return new_assignment

@router.get("/", response_model=List[ShiftResponse])
async def list_shifts(
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        raise HTTPException(status_code=400, detail="Manager profile not found")
    result = await db.execute(select(Shift).filter(Shift.manager_id == manager.id))
    return result.scalars().all()

@router.get("/me", response_model=List[ShiftResponse])
async def get_my_shifts(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can access this route")

    result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = result.scalars().first()

    # Get shift assignments for this employee
    # Note: In a full implementation, you'd also check team assignments
    result = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.employee_id == employee.id))
    assignments = result.scalars().all()
    
    shift_ids = [a.shift_id for a in assignments]
    if not shift_ids:
        return []
        
    result = await db.execute(select(Shift).filter(Shift.id.in_(shift_ids)))
    return result.scalars().all()
