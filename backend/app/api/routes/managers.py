from sqlalchemy.orm import selectinload
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Employee, Team, User, RoleEnum, Manager, team_members
from app.schemas import EmployeeCreate, EmployeeResponse, TeamCreate, TeamResponse
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    employee_in: EmployeeCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    # Create User
    new_user = User(
        email=employee_in.user.email,
        hashed_password=get_password_hash(employee_in.user.password),
        role=RoleEnum.EMPLOYEE
    )
    db.add(new_user)
    await db.flush()
    
    # Get Manager ID for the current_manager user
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        raise HTTPException(status_code=400, detail="Manager profile not found")

    new_employee = Employee(
        full_name=employee_in.full_name,
        user_id=new_user.id,
        manager_id=manager.id
    )
    db.add(new_employee)
    await db.commit()
    
    # Needs fetching related user
    result = await db.execute(
        select(Employee).options(selectinload(Employee.user)).filter(Employee.id == new_employee.id)
    )
    created_employee = result.scalars().first()
    return created_employee

@router.post("/teams", response_model=TeamResponse)
async def create_team(
    team_in: TeamCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    
    new_team = Team(
        name=team_in.name,
        manager_id=manager.id
    )
    db.add(new_team)
    await db.commit()
    await db.refresh(new_team)
    return new_team

@router.get("/employees", response_model=List[EmployeeResponse])
async def list_employees(
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    
    result = await db.execute(
        select(Employee).options(selectinload(Employee.user)).filter(Employee.manager_id == manager.id)
    )
    return result.scalars().all()
