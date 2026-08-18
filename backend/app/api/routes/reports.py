from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.api import deps
from app.models import ActivitySummary, User, Employee, Manager, RoleEnum, TaskAssignment, Task, Submission, SubmissionStatusEnum
from app.schemas.evaluation import EmployeeReport

router = APIRouter()

@router.get("/employee/{employee_id}", response_model=EmployeeReport)
async def generate_employee_report(
    employee_id: int,
    period_start: datetime,
    period_end: datetime,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    # Verify employee exists
    emp_result = await db.execute(select(Employee).filter(Employee.id == employee_id))
    employee = emp_result.scalars().first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Fetch Activity Metrics
    activity_query = select(
        func.sum(ActivitySummary.active_duration_seconds).label('total_active'),
        func.sum(ActivitySummary.idle_duration_seconds).label('total_idle')
    ).filter(
        ActivitySummary.employee_id == employee_id,
        ActivitySummary.timestamp >= period_start,
        ActivitySummary.timestamp <= period_end
    )
    activity_result = await db.execute(activity_query)
    activity_data = activity_result.first()
    total_active_seconds = activity_data.total_active or 0
    total_idle_seconds = activity_data.total_idle or 0

    # Fetch Task Metrics
    task_assignments_query = select(TaskAssignment.task_id).filter(TaskAssignment.employee_id == employee_id)
    ta_result = await db.execute(task_assignments_query)
    assigned_task_ids = [ta.task_id for ta in ta_result.scalars().all()]
    
    tasks_assigned = len(assigned_task_ids)
    tasks_completed = 0
    
    if tasks_assigned > 0:
        completed_query = select(func.count(Task.id)).filter(
            Task.id.in_(assigned_task_ids),
            Task.status == 'APPROVED'
        )
        completed_result = await db.execute(completed_query)
        tasks_completed = completed_result.scalar() or 0

    # Fetch Submission Metrics
    submissions_query = select(Submission).filter(
        Submission.employee_id == employee_id,
        Submission.submitted_at >= period_start,
        Submission.submitted_at <= period_end
    )
    submissions_result = await db.execute(submissions_query)
    submissions = submissions_result.scalars().all()
    
    total_submissions = len(submissions)
    approved_submissions = sum(1 for s in submissions if s.status == SubmissionStatusEnum.APPROVED)
    rejected_submissions = sum(1 for s in submissions if s.status == SubmissionStatusEnum.REJECTED)

    return EmployeeReport(
        employee_id=employee_id,
        employee_name=employee.user.full_name if employee.user else f"Employee #{employee_id}",
        period_start=period_start,
        period_end=period_end,
        tasks_assigned=tasks_assigned,
        tasks_completed=tasks_completed,
        total_active_minutes=total_active_seconds // 60,
        total_idle_minutes=total_idle_seconds // 60,
        total_submissions=total_submissions,
        approved_submissions=approved_submissions,
        rejected_submissions=rejected_submissions
    )
