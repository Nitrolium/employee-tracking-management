from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Submission, Task, User, Employee, Manager, RoleEnum, TaskStatusEnum, SubmissionStatusEnum
from app.schemas.submission import SubmissionCreate, SubmissionResponse, SubmissionReview

router = APIRouter()

@router.post("/", response_model=SubmissionResponse)
async def create_submission(
    submission_in: SubmissionCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can submit tasks")
        
    # Verify Task
    task_result = await db.execute(select(Task).filter(Task.id == submission_in.task_id))
    task = task_result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Get Employee
    emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = emp_result.scalars().first()
    
    # Calculate version
    sub_result = await db.execute(
        select(Submission).filter(Submission.task_id == task.id, Submission.employee_id == employee.id)
    )
    existing_submissions = sub_result.scalars().all()
    version = len(existing_submissions) + 1

    new_submission = Submission(
        task_id=task.id,
        employee_id=employee.id,
        comment=submission_in.comment,
        version=version
    )
    db.add(new_submission)
    
    # Update Task Status
    task.status = TaskStatusEnum.SUBMITTED
    
    await db.commit()
    await db.refresh(new_submission)
    return new_submission

@router.patch("/{submission_id}/review", response_model=SubmissionResponse)
async def review_submission(
    submission_id: int,
    review_in: SubmissionReview,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    sub_result = await db.execute(select(Submission).filter(Submission.id == submission_id))
    submission = sub_result.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = manager_result.scalars().first()

    submission.status = review_in.status
    submission.manager_feedback = review_in.manager_feedback
    submission.reviewed_by = manager.id
    
    # Update corresponding task status
    task_result = await db.execute(select(Task).filter(Task.id == submission.task_id))
    task = task_result.scalars().first()
    if task:
        if review_in.status == SubmissionStatusEnum.APPROVED:
            task.status = TaskStatusEnum.APPROVED
        elif review_in.status == SubmissionStatusEnum.REJECTED:
            task.status = TaskStatusEnum.REJECTED
            
    await db.commit()
    await db.refresh(submission)
    return submission
