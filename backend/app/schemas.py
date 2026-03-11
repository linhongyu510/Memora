"""
Pydantic 序列化模型 - 用于 API 请求/响应
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .models import MediaType


# ============ 分类 ============
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 标签 ============
class TagBase(BaseModel):
    name: str
    color: Optional[str] = "#3B82F6"
    sort_order: int = 0


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ 笔记 ============
class NoteBase(BaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    media_type: MediaType = MediaType.TEXT
    category_id: Optional[int] = None


class NoteCreate(NoteBase):
    pass


class NoteResponse(NoteBase):
    id: int
    original_path: Optional[str] = None
    status: str = "pending"
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tags: List[TagResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ============ 上传处理结果 ============
class UploadItemResponse(BaseModel):
    note_id: int
    filename: str
    status: str
    message: str
    media_type: Optional[MediaType] = None
    suggested_tags: List[str] = Field(default_factory=list)


class UploadBatchResponse(BaseModel):
    total: int
    completed: int
    failed: int
    results: List[UploadItemResponse]


class NoteStatusItem(BaseModel):
    note_id: int
    status: str
    error_message: Optional[str] = None


class NoteStatusBatchResponse(BaseModel):
    items: List[NoteStatusItem] = Field(default_factory=list)
