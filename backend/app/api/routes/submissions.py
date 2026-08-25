from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models import Submission, SubmissionFile, FileRecord, Task, User, Employee, Manager, RoleEnum, TaskStatusEnum, SubmissionStatusEnum
from app.schemas.submission import SubmissionCreate, SubmissionResponse, SubmissionReview
from app.schemas.file import FileResponse

router = APIRouter()

def serialize_submission(s: Submission) -> SubmissionResponse:
    files_list = [
        FileResponse(
            id=sf.file.id,
            filename=sf.file.filename,
            filepath=sf.file.filepath,
            mime_type=sf.file.mime_type,
            size=sf.file.size,
            uploaded_by=sf.file.uploaded_by,
            uploaded_at=sf.file.uploaded_at
        )
        for sf in (s.files or []) if sf.file is not None
    ]

    return SubmissionResponse(
        id=s.id,
        task_id=s.task_id,
        employee_id=s.employee_id,
        status=s.status,
        comment=s.comment,
        version=s.version,
        submitted_at=s.submitted_at,
        reviewed_by=s.reviewed_by,
        manager_feedback=s.manager_feedback,
        files=files_list,
        employee_name=s.employee.full_name if s.employee else None,
        task_title=s.task.title if s.task else None
    )

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
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    
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
        version=version,
        status=SubmissionStatusEnum.PENDING
    )
    db.add(new_submission)
    await db.flush()

    # Link attached files
    if submission_in.file_ids:
        for fid in submission_in.file_ids:
            sf = SubmissionFile(submission_id=new_submission.id, file_id=fid)
            db.add(sf)
    
    # Update Task Status
    task.status = TaskStatusEnum.SUBMITTED
    
    await db.commit()

    query = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.files).selectinload(SubmissionFile.file),
            selectinload(Submission.employee),
            selectinload(Submission.task)
        )
        .filter(Submission.id == new_submission.id)
    )
    loaded_sub = query.scalars().first()
    return serialize_submission(loaded_sub)

@router.get("/", response_model=List[SubmissionResponse])
async def list_submissions(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    base_query = select(Submission).options(
        selectinload(Submission.files).selectinload(SubmissionFile.file),
        selectinload(Submission.employee),
        selectinload(Submission.task)
    )

    if current_user.role == RoleEnum.MANAGER:
        result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = result.scalars().first()
        if not manager:
            return []
        tasks_res = await db.execute(select(Task.id).filter(Task.manager_id == manager.id))
        task_ids = tasks_res.scalars().all()
        if not task_ids:
            return []
        sub_res = await db.execute(base_query.filter(Submission.task_id.in_(task_ids)).order_by(Submission.submitted_at.desc()))
        subs = sub_res.scalars().all()
        return [serialize_submission(s) for s in subs]

    elif current_user.role == RoleEnum.EMPLOYEE:
        emp_res = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
        employee = emp_res.scalars().first()
        if not employee:
            return []
        sub_res = await db.execute(base_query.filter(Submission.employee_id == employee.id).order_by(Submission.submitted_at.desc()))
        subs = sub_res.scalars().all()
        return [serialize_submission(s) for s in subs]

    return []

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
    if not manager:
        raise HTTPException(status_code=400, detail="Manager profile not found")

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

    query = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.files).selectinload(SubmissionFile.file),
            selectinload(Submission.employee),
            selectinload(Submission.task)
        )
        .filter(Submission.id == submission.id)
    )
    loaded_sub = query.scalars().first()
    return serialize_submission(loaded_sub)

