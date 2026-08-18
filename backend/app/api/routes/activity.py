from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import ActivitySummary, ApplicationUsage, User, Employee, Manager, RoleEnum
from app.schemas.activity import ActivitySyncRequest, ActivitySummaryResponse

router = APIRouter()

@router.post("/sync")
async def sync_activity(
    sync_req: ActivitySyncRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can sync activity")
        
    emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = emp_result.scalars().first()
    
    # Process each summary
    for summary_in in sync_req.summaries:
        # Prevent duplicates based on timestamp + employee
        existing = await db.execute(
            select(ActivitySummary).filter(
                ActivitySummary.employee_id == employee.id,
                ActivitySummary.timestamp == summary_in.timestamp
            )
        )
        if existing.scalars().first():
            continue # Skip duplicate
            
        new_summary = ActivitySummary(
            employee_id=employee.id,
            timestamp=summary_in.timestamp,
            duration_minutes=summary_in.duration_minutes,
            active_duration_seconds=summary_in.active_duration_seconds,
            idle_duration_seconds=summary_in.idle_duration_seconds,
            mouse_event_count=summary_in.mouse_event_count,
            keyboard_event_count=summary_in.keyboard_event_count
        )
        db.add(new_summary)
        await db.flush() # To get the new_summary.id
        
        for app_usage in summary_in.app_usages:
            new_app = ApplicationUsage(
                employee_id=employee.id,
                summary_id=new_summary.id,
                app_name=app_usage.app_name,
                window_title=app_usage.window_title,
                duration_seconds=app_usage.duration_seconds
            )
            db.add(new_app)
            
    await db.commit()
    return {"status": "success", "synced": len(sync_req.summaries)}

@router.get("/summaries", response_model=List[ActivitySummaryResponse])
async def get_activity_summaries(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role == RoleEnum.MANAGER:
        manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = manager_result.scalars().first()
        
        # In a real app, you'd filter by employees assigned to this manager
        result = await db.execute(select(ActivitySummary))
        return result.scalars().all()
        
    elif current_user.role == RoleEnum.EMPLOYEE:
        emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
        employee = emp_result.scalars().first()
        
        result = await db.execute(select(ActivitySummary).filter(ActivitySummary.employee_id == employee.id))
        return result.scalars().all()
        
    return []
