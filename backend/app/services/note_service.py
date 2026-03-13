"""
笔记持久化服务 - 将解析结果与 LLM 输出保存到数据库
"""
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import Note, Tag, Category
from app.models import MediaType as DbMediaType
from app.schemas.pipeline import ParsedContent, LLMResult, MediaType as PipelineMediaType
from app.core.config import get_settings


def _pipeline_to_db_media_type(mt: PipelineMediaType) -> DbMediaType:
    """Pipeline MediaType 转为 DB MediaType"""
    return DbMediaType(mt.value)


def _get_or_create_category(db: Session, name: str):
    """按名称获取或创建分类"""
    if not name or not name.strip():
        return None
    name = name.strip()
    cat = db.query(Category).filter(Category.name == name).first()
    if cat:
        return cat
    cat = Category(name=name, parent_id=None, sort_order=0)
    db.add(cat)
    db.flush()
    return cat


def _get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    """按名称列表获取或创建标签"""
    normalized_names: list[str] = []
    seen_names: set[str] = set()

    for name in tag_names or []:
        normalized_name = str(name).strip()
        if not normalized_name or normalized_name in seen_names:
            continue
        normalized_names.append(normalized_name)
        seen_names.add(normalized_name)

    if not normalized_names:
        return []

    existing_tags = db.query(Tag).filter(Tag.name.in_(normalized_names)).all()
    existing_map = {tag.name: tag for tag in existing_tags}

    tags: list[Tag] = []
    for name in normalized_names:
        tag = existing_map.get(name)
        if not tag:
            tag = Tag(name=name, color="#3B82F6", sort_order=0)
            db.add(tag)
            db.flush()
            existing_map[name] = tag
        tags.append(tag)

    return tags


def save_note(
    db: Session,
    parsed: ParsedContent,
    llm_result: LLMResult,
    file_bytes: bytes,
) -> Note:
    """
    将解析结果和 LLM 输出持久化到数据库，并保存原始文件

    Returns:
        创建好的 Note 对象
    """
    settings = get_settings()
    from app.core.config import _BACKEND_DIR
    upload_dir = _BACKEND_DIR / settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 生成唯一文件名，保留扩展名
    ext = Path(parsed.filename).suffix if parsed.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name

    try:
        file_path.write_bytes(file_bytes)
        # 存相对路径
        original_path = f"{settings.UPLOAD_DIR}/{unique_name}"

        # 获取或创建分类
        category = _get_or_create_category(db, llm_result.category)
        category_id = category.id if category else None

        # 获取或创建标签
        tags = _get_or_create_tags(db, llm_result.suggested_tags)

        # 创建笔记
        note = Note(
            title=llm_result.title[:200],
            summary=llm_result.summary,
            content=parsed.raw_text[:50000],  # 限制长度
            media_type=_pipeline_to_db_media_type(parsed.media_type),
            original_path=original_path,
            status="completed",
            category_id=category_id,
        )
        db.add(note)
        db.flush()
        note.tags = tags
        db.commit()
        db.refresh(note)
        return note
    except Exception:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise
