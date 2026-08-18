from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FileBase(BaseModel):
    filename: str
    filepath: str
    mime_type: str
    size: int

class FileCreate(FileBase):
    uploaded_by: int

class FileResponse(FileBase):
    id: int
    uploaded_by: int
    uploaded_at: datetime
    class Config:
        from_attributes = True
