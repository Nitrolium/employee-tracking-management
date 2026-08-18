from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Evaluation, User, Employee, Manager, RoleEnum
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse

router = APIRouter()

@router.post("/", response_model=EvaluationResponse)
async def create_evaluation(
    eval_in: EvaluationCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_manager: User = Depends(deps.get_current_manager)
):
    manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_manager.id))
    manager = manager_result.scalars().first()
    
    new_eval = Evaluation(
        manager_id=manager.id,
        employee_id=eval_in.employee_id,
        period_start=eval_in.period_start,
        period_end=eval_in.period_end,
        performance_score=eval_in.performance_score,
        manager_comments=eval_in.manager_comments
    )
    
    db.add(new_eval)
    await db.commit()
    await db.refresh(new_eval)
    return new_eval

@router.get("/", response_model=List[EvaluationResponse])
async def get_evaluations(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role == RoleEnum.MANAGER:
        manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = manager_result.scalars().first()
        result = await db.execute(select(Evaluation).filter(Evaluation.manager_id == manager.id))
        return result.scalars().all()
        
    elif current_user.role == RoleEnum.EMPLOYEE:
        emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
        employee = emp_result.scalars().first()
        result = await db.execute(select(Evaluation).filter(Evaluation.employee_id == employee.id))
        return result.scalars().all()
        
    return []
