from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.core import security, config
from app.models import User, RoleEnum
import jwt
from pydantic import ValidationError
from app.schemas import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{config.settings.API_V1_STR}/auth/login")

async def get_db() -> Generator:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(
            token, config.settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenData(email=payload.get("sub"))
    except (jwt.PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    result = await db.execute(select(User).filter(User.email == token_data.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_manager(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
