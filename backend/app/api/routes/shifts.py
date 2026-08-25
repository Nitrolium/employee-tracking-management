from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models import Shift, ShiftAssignment, User, Manager, Employee, RoleEnum, Team, team_members
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
        manager = Manager(
            full_name=current_manager.email.split("@")[0].capitalize(),
            department="Management",
            user_id=current_manager.id
        )
        db.add(manager)
        await db.commit()
        await db.refresh(manager)

    effective = shift_in.effective_date or date.today()
    working_days_data = shift_in.working_days
    if not isinstance(working_days_data, list):
        if isinstance(working_days_data, str) and "," in working_days_data:
            try:
                working_days_data = [int(x.strip()) for x in working_days_data.split(",") if x.strip().isdigit()]
            except Exception:
                working_days_data = [1, 2, 3, 4, 5]
        else:
            working_days_data = [1, 2, 3, 4, 5]

    new_shift = Shift(
        name=shift_in.name,
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        working_days=working_days_data,
        break_duration_minutes=shift_in.break_duration_minutes or 60,
        effective_date=effective,
        manager_id=manager.id
    )
    db.add(new_shift)
    await db.commit()
    await db.refresh(new_shift)

    return ShiftResponse(
        id=new_shift.id,
        name=new_shift.name,
        start_time=new_shift.start_time,
        end_time=new_shift.end_time,
        working_days=new_shift.working_days,
        break_duration_minutes=new_shift.break_duration_minutes,
        effective_date=new_shift.effective_date,
        manager_id=new_shift.manager_id,
        assignment_count=0
    )


@router.post("/assign", response_model=ShiftAssignmentResponse)
async def assign_shift(
    assignment_in: ShiftAssignmentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    if not assignment_in.employee_id and not assignment_in.team_id:
        raise HTTPException(status_code=400, detail="Must specify employee_id or team_id")

    # If team_id is specified, assign shift to team and all employees in that team
    new_assignment = ShiftAssignment(
        shift_id=assignment_in.shift_id,
        employee_id=assignment_in.employee_id,
        team_id=assignment_in.team_id
    )
    db.add(new_assignment)

    emp_name = None
    team_name = None

    if assignment_in.employee_id:
        emp_res = await db.execute(select(Employee).filter(Employee.id == assignment_in.employee_id))
        emp = emp_res.scalars().first()
        if emp:
            emp_name = emp.full_name

    if assignment_in.team_id:
        team_res = await db.execute(
            select(Team).options(selectinload(Team.members)).filter(Team.id == assignment_in.team_id)
        )
        team = team_res.scalars().first()
        if team:
            team_name = team.name
            # Also create direct assignments for all team members for fast querying
            for member in (team.members or []):
                member_assignment = ShiftAssignment(
                    shift_id=assignment_in.shift_id,
                    employee_id=member.id,
                    team_id=team.id
                )
                db.add(member_assignment)

    await db.commit()
    await db.refresh(new_assignment)

    return ShiftAssignmentResponse(
        id=new_assignment.id,
        shift_id=new_assignment.shift_id,
        employee_id=new_assignment.employee_id,
        team_id=new_assignment.team_id,
        employee_name=emp_name,
        team_name=team_name
    )

@router.get("/", response_model=List[ShiftResponse])
async def list_shifts(
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        return []

    result = await db.execute(
        select(Shift)
        .options(selectinload(Shift.assignments))
        .filter(Shift.manager_id == manager.id)
    )
    shifts = result.scalars().all()


    return [
        ShiftResponse(
            id=s.id,
            name=s.name,
            start_time=s.start_time,
            end_time=s.end_time,
            working_days=s.working_days,
            break_duration_minutes=s.break_duration_minutes,
            effective_date=s.effective_date,
            manager_id=s.manager_id,
            assignment_count=len(s.assignments or [])
        )
        for s in shifts
    ]

@router.get("/me", response_model=List[ShiftResponse])
async def get_my_shifts(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can access this route")

    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.teams))
        .filter(Employee.user_id == current_user.id)
    )
    employee = result.scalars().first()
    if not employee:
        return []

    team_ids = [t.id for t in (employee.teams or [])]

    # Get shift assignments for this employee directly or via teams
    assign_query = select(ShiftAssignment).filter(
        (ShiftAssignment.employee_id == employee.id) |
        (ShiftAssignment.team_id.in_(team_ids) if team_ids else False)
    )
    assign_res = await db.execute(assign_query)
    assignments = assign_res.scalars().all()
    
    shift_ids = list(set([a.shift_id for a in assignments]))
    if not shift_ids:
        return []
        
    result = await db.execute(select(Shift).filter(Shift.id.in_(shift_ids)))
    shifts = result.scalars().all()
    return [
        ShiftResponse(
            id=s.id,
            name=s.name,
            start_time=s.start_time,
            end_time=s.end_time,
            working_days=s.working_days,
            break_duration_minutes=s.break_duration_minutes,
            effective_date=s.effective_date,
            manager_id=s.manager_id,
            assignment_count=0
        )
        for s in shifts
    ]

