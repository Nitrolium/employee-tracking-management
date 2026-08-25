from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models import Task, TaskAssignment, TaskFile, FileRecord, User, Manager, Employee, RoleEnum, TaskStatusEnum, Team
from app.schemas.task import TaskCreate, TaskResponse, TaskAssignmentCreate, TaskAssignmentResponse, TaskUpdate
from app.schemas.file import FileResponse

router = APIRouter()

def serialize_task(t: Task) -> TaskResponse:
    files_list = [
        FileResponse(
            id=tf.file.id,
            filename=tf.file.filename,
            filepath=tf.file.filepath,
            mime_type=tf.file.mime_type,
            size=tf.file.size,
            uploaded_by=tf.file.uploaded_by,
            uploaded_at=tf.file.uploaded_at
        )
        for tf in (t.files or []) if tf.file is not None
    ]
    
    assignments_list = []
    assigned_names = []
    for a in (t.assignments or []):
        emp_name = a.employee.full_name if a.employee else None
        team_name = a.team.name if getattr(a, "team", None) else None
        if emp_name and emp_name not in assigned_names:
            assigned_names.append(emp_name)
        elif team_name and f"Team: {team_name}" not in assigned_names:
            assigned_names.append(f"Team: {team_name}")
            
        assignments_list.append(
            TaskAssignmentResponse(
                id=a.id,
                task_id=a.task_id,
                employee_id=a.employee_id,
                team_id=a.team_id,
                employee_name=emp_name,
                team_name=team_name
            )
        )
        
    return TaskResponse(
        id=t.id,
        title=t.title,
        description=t.description,
        priority=t.priority,
        deadline=t.deadline,
        expected_duration=t.expected_duration,
        manager_id=t.manager_id,
        status=t.status,
        created_at=t.created_at,
        files=files_list,
        assignments=assignments_list,
        assigned_to_name=", ".join(assigned_names) if assigned_names else None
    )

@router.post("/", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = result.scalars().first()
    if not manager:
        raise HTTPException(status_code=400, detail="Manager profile not found")

    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        deadline=task_in.deadline,
        expected_duration=task_in.expected_duration,
        manager_id=manager.id,
        status=TaskStatusEnum.ASSIGNED
    )
    db.add(new_task)
    await db.flush()

    # Associate attached files
    if task_in.file_ids:
        for fid in task_in.file_ids:
            tf = TaskFile(task_id=new_task.id, file_id=fid)
            db.add(tf)

    # Associate assigned employees directly
    assigned_emp_set = set(task_in.assigned_employee_ids or [])
    if task_in.assigned_employee_ids:
        for eid in task_in.assigned_employee_ids:
            ta = TaskAssignment(task_id=new_task.id, employee_id=eid)
            db.add(ta)

    # Associate assigned teams and all their members
    if task_in.assigned_team_ids:
        for tid in task_in.assigned_team_ids:
            # Assign to team
            team_ta = TaskAssignment(task_id=new_task.id, team_id=tid)
            db.add(team_ta)
            # Find all team members and assign individually too
            team_res = await db.execute(
                select(Team).options(selectinload(Team.members)).filter(Team.id == tid)
            )
            team_obj = team_res.scalars().first()
            if team_obj:
                for member in (team_obj.members or []):
                    if member.id not in assigned_emp_set:
                        assigned_emp_set.add(member.id)
                        member_ta = TaskAssignment(task_id=new_task.id, employee_id=member.id, team_id=tid)
                        db.add(member_ta)

    await db.commit()

    # Re-query with eager relationships
    task_query = await db.execute(
        select(Task)
        .options(
            selectinload(Task.files).selectinload(TaskFile.file),
            selectinload(Task.assignments).selectinload(TaskAssignment.employee),
            selectinload(Task.assignments).selectinload(TaskAssignment.team)
        )
        .filter(Task.id == new_task.id)
    )
    loaded_task = task_query.scalars().first()
    return serialize_task(loaded_task)

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

    if assignment_in.team_id:
        team_res = await db.execute(
            select(Team).options(selectinload(Team.members)).filter(Team.id == assignment_in.team_id)
        )
        team_obj = team_res.scalars().first()
        if team_obj:
            for member in (team_obj.members or []):
                member_ta = TaskAssignment(
                    task_id=assignment_in.task_id,
                    employee_id=member.id,
                    team_id=assignment_in.team_id
                )
                db.add(member_ta)

    await db.commit()
    
    query = await db.execute(
        select(TaskAssignment)
        .options(
            selectinload(TaskAssignment.employee),
            selectinload(TaskAssignment.team)
        )
        .filter(TaskAssignment.id == new_assignment.id)
    )
    loaded_a = query.scalars().first()
    return TaskAssignmentResponse(
        id=loaded_a.id,
        task_id=loaded_a.task_id,
        employee_id=loaded_a.employee_id,
        team_id=loaded_a.team_id,
        employee_name=loaded_a.employee.full_name if loaded_a.employee else None,
        team_name=loaded_a.team.name if getattr(loaded_a, "team", None) else None
    )

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    base_query = select(Task).options(
        selectinload(Task.files).selectinload(TaskFile.file),
        selectinload(Task.assignments).selectinload(TaskAssignment.employee),
        selectinload(Task.assignments).selectinload(TaskAssignment.team)
    )

    if current_user.role == RoleEnum.MANAGER:
        result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = result.scalars().first()
        if not manager:
            return []
        query_result = await db.execute(base_query.filter(Task.manager_id == manager.id).order_by(Task.created_at.desc()))
        tasks = query_result.scalars().all()
        return [serialize_task(t) for t in tasks]

    elif current_user.role == RoleEnum.EMPLOYEE:
        emp_result = await db.execute(
            select(Employee)
            .options(selectinload(Employee.teams))
            .filter(Employee.user_id == current_user.id)
        )
        employee = emp_result.scalars().first()
        if not employee:
            return []
        
        team_ids = [t.id for t in (employee.teams or [])]

        assign_query = select(TaskAssignment).filter(
            (TaskAssignment.employee_id == employee.id) |
            (TaskAssignment.team_id.in_(team_ids) if team_ids else False)
        )
        assign_result = await db.execute(assign_query)
        assignments = assign_result.scalars().all()
        task_ids = list(set([a.task_id for a in assignments]))
        if not task_ids:
            return []
        query_result = await db.execute(base_query.filter(Task.id.in_(task_ids)).order_by(Task.created_at.desc()))
        tasks = query_result.scalars().all()
        return [serialize_task(t) for t in tasks]

    return []

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = await db.execute(
        select(Task)
        .options(
            selectinload(Task.files).selectinload(TaskFile.file),
            selectinload(Task.assignments).selectinload(TaskAssignment.employee),
            selectinload(Task.assignments).selectinload(TaskAssignment.team)
        )
        .filter(Task.id == task_id)
    )
    task = query.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task_update.status:
        task.status = task_update.status
    if task_update.title:
        task.title = task_update.title
    if task_update.description:
        task.description = task_update.description
    if task_update.priority:
        task.priority = task_update.priority
    if task_update.deadline:
        task.deadline = task_update.deadline

    await db.commit()
    await db.refresh(task)
    return serialize_task(task)


