from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Task, TaskAssignment, User, Manager, Employee, RoleEnum, TaskStatusEnum
from app.schemas.task import TaskCreate, TaskResponse, TaskAssignmentCreate, TaskAssignmentResponse, TaskUpdate

router = APIRouter()

@router.post("/", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()

    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        deadline=task_in.deadline,
        expected_duration=task_in.expected_duration,
        manager_id=manager.id
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

@router.post("/assign", response_model=TaskAssignmentResponse)
async def assign_task(
    assignment_in: TaskAssignmentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    new_assignment = TaskAssignment(
        task_id=assignment_in.task_id,
        employee_id=assignment_in.employee_id,
        team_id=assignment_in.team_id
    )
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return new_assignment

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # In a full app, this would filter by the user's role (Manager sees all they created, Employee sees assigned)
    if current_user.role == RoleEnum.MANAGER:
        result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = result.scalars().first()
        result = await db.execute(select(Task).filter(Task.manager_id == manager.id))
        return result.scalars().all()
    elif current_user.role == RoleEnum.EMPLOYEE:
        result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
        employee = result.scalars().first()
        
        assign_result = await db.execute(select(TaskAssignment).filter(TaskAssignment.employee_id == employee.id))
        assignments = assign_result.scalars().all()
        task_ids = [a.task_id for a in assignments]
        if not task_ids:
            return []
        task_result = await db.execute(select(Task).filter(Task.id.in_(task_ids)))
        return task_result.scalars().all()

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(select(Task).filter(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = task_update.status
    await db.commit()
    await db.refresh(task)
    return task
