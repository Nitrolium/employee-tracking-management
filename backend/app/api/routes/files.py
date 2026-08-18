import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models import FileRecord, User, TaskFile
from app.schemas.file import FileResponse
import uuid

router = APIRouter()
UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".pdf", ".zip", ".docx", ".xlsx", ".jpg", ".png", ".txt"}

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed.")
        
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get file size
    size = os.path.getsize(filepath)
    
    new_file = FileRecord(
        filename=file.filename,
        filepath=filepath,
        mime_type=file.content_type or "application/octet-stream",
        size=size,
        uploaded_by=current_user.id
    )
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    return new_file

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(select(FileRecord).filter(FileRecord.id == file_id))
    file_record = result.scalars().first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
        
    # In a full app, implement detailed authorization here based on task/team assignments
    if not os.path.exists(file_record.filepath):
        raise HTTPException(status_code=404, detail="Physical file not found on server")
        
    return FastAPIFileResponse(
        path=file_record.filepath, 
        filename=file_record.filename, 
        media_type=file_record.mime_type
    )
