from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import Employee, User, RoleEnum
from app.schemas import EmployeeResponse

router = APIRouter()

@router.get("/me", response_model=EmployeeResponse)
async def read_employee_me(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="User is not an employee")
    
    result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = result.scalars().first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    return employee
