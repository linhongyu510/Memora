"""
API 路由 - 多模态解析 Pipeline、笔记 CRUD
"""
from fastapi import APIRouter, UploadFile, HTTPException, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.schemas.pipeline import LLMResult
from app.schemas.db import (
    CategoryCreate,
    CategoryResponse,
    TagCreate,
    TagResponse,
    NoteResponse,
)
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services.dispatcher import process_file
from app.services.summarizer import summarize
from app.services.note_service import save_note
from app.services.system_config import get_llm_settings_response, set_value
from app.models import Category, Tag, Note

router = APIRouter(prefix="/api", tags=["api"])


# ==================== Pipeline ====================
async def _read_upload_file(file: UploadFile) -> tuple[str, bytes]:
    """读取并校验上传文件"""
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="缺少文件名")

    try:
        file_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"读取文件失败: {exc}") from exc

    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件为空")

    return filename, file_bytes


async def _parse_and_summarize(
    filename: str,
    file_bytes: bytes,
    content_type: str | None,
    db: Session | None = None,
):
    """执行解析与摘要流程"""
    try:
        parsed = await process_file(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await summarize(raw_text=parsed.raw_text, db=db)
    return parsed, result


@router.post("/process", response_model=LLMResult)
async def process_file_only(
    file: UploadFile,
    db: Session = Depends(get_db),
) -> LLMResult:
    """
    多模态解析 Pipeline（不保存）：
    上传文件 -> dispatcher 提取 -> summarizer 摘要 -> 返回 JSON
    支持格式: txt/md, pdf/docx, png/jpg, mp3/wav, mp4 等
    """
    filename, file_bytes = await _read_upload_file(file)
    _, result = await _parse_and_summarize(
        filename=filename,
        file_bytes=file_bytes,
        content_type=file.content_type,
        db=db,
    )
    return result


@router.post("/upload", response_model=NoteResponse)
async def upload_and_save(
    file: UploadFile,
    db: Session = Depends(get_db),
) -> NoteResponse:
    """
    上传文件 -> 解析 -> LLM 摘要 -> 保存到数据库 -> 返回笔记
    """
    filename, file_bytes = await _read_upload_file(file)
    parsed, result = await _parse_and_summarize(
        filename=filename,
        file_bytes=file_bytes,
        content_type=file.content_type,
        db=db,
    )

    try:
        note = save_note(db=db, parsed=parsed, llm_result=result, file_bytes=file_bytes)
        return NoteResponse.model_validate(note)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存笔记失败: {exc}") from exc


# ==================== 系统设置 ====================


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return SettingsResponse(**get_llm_settings_response(db))


@router.post("/settings", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    if payload.clear_llm_api_key:
        set_value(db, "llm_api_key", None, is_secret=True)
    elif payload.llm_api_key is not None:
        normalized_key = payload.llm_api_key.strip()
        if normalized_key:
            set_value(db, "llm_api_key", normalized_key, is_secret=True)

    if payload.llm_api_base is not None:
        set_value(db, "llm_api_base", payload.llm_api_base, is_secret=False)

    if payload.llm_model is not None:
        set_value(db, "llm_model", payload.llm_model, is_secret=False)

    db.commit()
    return SettingsResponse(**get_llm_settings_response(db))


# ==================== 分类 CRUD ====================


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """获取所有分类（扁平列表）"""
    return db.query(Category).order_by(Category.sort_order, Category.id).all()


@router.post("/categories", response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    """创建分类"""
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        return existing

    cat = Category(**data.model_dump())
    try:
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return cat
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="分类已存在") from exc


# ==================== 标签 CRUD ====================


@router.get("/tags", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    """获取所有标签"""
    return db.query(Tag).order_by(Tag.sort_order, Tag.id).all()


@router.post("/tags", response_model=TagResponse)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    """创建标签"""
    existing = db.query(Tag).filter(Tag.name == data.name).first()
    if existing:
        return existing

    tag = Tag(**data.model_dump())
    try:
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag
    except IntegrityError:
        db.rollback()
        existing = db.query(Tag).filter(Tag.name == data.name).first()
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="标签已存在")


# ==================== 笔记 CRUD ====================


@router.get("/notes", response_model=list[NoteResponse])
def list_notes(
    category_id: int | None = None,
    db: Session = Depends(get_db),
):
    """获取笔记列表，可按分类筛选"""
    q = db.query(Note).options(selectinload(Note.tags)).filter(Note.status == "completed")
    if category_id is not None:
        q = q.filter(Note.category_id == category_id)
    return q.order_by(Note.created_at.desc()).all()


@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    """获取笔记详情"""
    note = db.query(Note).options(selectinload(Note.tags)).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return note
