from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models import Team, Employee, Manager, User, RoleEnum, team_members
from app.schemas import TeamCreate, TeamResponse, AddTeamMembersRequest, EmployeeResponse, UserResponse

router = APIRouter()

def serialize_team(team: Team) -> TeamResponse:
    members_list = [
        EmployeeResponse(
            id=emp.id,
            user_id=emp.user_id,
            full_name=emp.full_name,
            manager_id=emp.manager_id,
            user=UserResponse(
                id=emp.user.id,
                email=emp.user.email,
                role=emp.user.role,
                created_at=emp.user.created_at
            )
        )
        for emp in (team.members or []) if emp.user is not None
    ]
    return TeamResponse(
        id=team.id,
        name=team.name,
        manager_id=team.manager_id,
        created_at=team.created_at,
        members=members_list,
        member_count=len(members_list)
    )

@router.get("/", response_model=List[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        return []

    teams_res = await db.execute(
        select(Team)
        .options(
            selectinload(Team.members).selectinload(Employee.user)
        )
        .filter(Team.manager_id == manager.id)
    )
    teams = teams_res.scalars().all()
    return [serialize_team(t) for t in teams]

@router.post("/", response_model=TeamResponse)
async def create_team(
    team_in: TeamCreate,
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


    new_team = Team(
        name=team_in.name,
        manager_id=manager.id
    )
    db.add(new_team)
    await db.flush()

    if team_in.member_employee_ids:
        emp_res = await db.execute(
            select(Employee).filter(Employee.id.in_(team_in.member_employee_ids))
        )
        members = emp_res.scalars().all()
        for m in members:
            new_team.members.append(m)

    await db.commit()

    loaded = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(Employee.user))
        .filter(Team.id == new_team.id)
    )
    team_obj = loaded.scalars().first()
    return serialize_team(team_obj)

@router.post("/{team_id}/members", response_model=TeamResponse)
async def add_team_members(
    team_id: int,
    request: AddTeamMembersRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    team_res = await db.execute(
        select(Team).options(selectinload(Team.members).selectinload(Employee.user)).filter(Team.id == team_id)
    )
    team = team_res.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing_ids = set(m.id for m in team.members)
    new_ids = [eid for eid in request.employee_ids if eid not in existing_ids]

    if new_ids:
        emp_res = await db.execute(select(Employee).filter(Employee.id.in_(new_ids)))
        to_add = emp_res.scalars().all()
        for emp in to_add:
            team.members.append(emp)
        await db.commit()

    reloaded = await db.execute(
        select(Team).options(selectinload(Team.members).selectinload(Employee.user)).filter(Team.id == team_id)
    )
    return serialize_team(reloaded.scalars().first())

@router.delete("/{team_id}/members/{employee_id}", response_model=TeamResponse)
async def remove_team_member(
    team_id: int,
    employee_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    team_res = await db.execute(
        select(Team).options(selectinload(Team.members).selectinload(Employee.user)).filter(Team.id == team_id)
    )
    team = team_res.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team.members = [m for m in team.members if m.id != employee_id]
    await db.commit()

    reloaded = await db.execute(
        select(Team).options(selectinload(Team.members).selectinload(Employee.user)).filter(Team.id == team_id)
    )
    return serialize_team(reloaded.scalars().first())

@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    team_res = await db.execute(select(Team).filter(Team.id == team_id))
    team = team_res.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    await db.delete(team)
    await db.commit()
    return {"message": "Team deleted successfully"}

@router.get("/me", response_model=List[TeamResponse])
async def get_my_teams(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    emp_res = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.teams)
            .selectinload(Team.members)
            .selectinload(Employee.user)
        )
        .filter(Employee.user_id == current_user.id)
    )
    emp = emp_res.scalars().first()
    if not emp:
        return []
    return [serialize_team(t) for t in (emp.teams or [])]
