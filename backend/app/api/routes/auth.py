from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.core import security, config
from app.models import User, RoleEnum
from app.schemas import Token, ManagerCreate, ManagerResponse, EmployeeCreate, EmployeeResponse, RoleEnum
from app.models import Manager, Employee
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/register/manager", response_model=ManagerResponse)
async def register_manager(
    manager_in: ManagerCreate,
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(User).filter(User.email == manager_in.user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        email=manager_in.user.email,
        hashed_password=get_password_hash(manager_in.user.password),
        role=RoleEnum.MANAGER
    )
    db.add(new_user)
    await db.flush()
    
    new_manager = Manager(
        full_name=manager_in.full_name,
        department=manager_in.department,
        user_id=new_user.id
    )
    db.add(new_manager)
    await db.commit()
    await db.refresh(new_manager)
    
    result = await db.execute(select(Manager).filter(Manager.id == new_manager.id))
    return result.scalars().first()

@router.post("/register/employee", response_model=EmployeeResponse)
async def register_employee(
    employee_in: EmployeeCreate,
    db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(select(User).filter(User.email == employee_in.user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        email=employee_in.user.email,
        hashed_password=get_password_hash(employee_in.user.password),
        role=RoleEnum.EMPLOYEE
    )
    db.add(new_user)
    await db.flush()
    
    new_employee = Employee(
        full_name=employee_in.full_name,
        user_id=new_user.id,
        manager_id=employee_in.manager_id
    )
    db.add(new_employee)
    await db.commit()
    await db.refresh(new_employee)
    
    result = await db.execute(select(Employee).filter(Employee.id == new_employee.id))
    return result.scalars().first()

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> dict:
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.email, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
