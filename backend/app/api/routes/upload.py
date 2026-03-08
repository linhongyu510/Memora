"""
上传与处理流水线路由。
"""

from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Category, Note, Tag
from ...schemas import UploadBatchResponse, UploadItemResponse
from ...services.ai_summarizer import summarize_text
from ...services.ingestion import IngestionError, ingest_file

router = APIRouter(prefix="/api", tags=["upload"])

# 统一存储原始上传文件，方便后续做媒体预览和回溯处理。
UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "storage" / "uploads"


@router.post("/upload", response_model=UploadBatchResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    category_id: Optional[int] = Form(default=None),
    db: Session = Depends(get_db),
):
    """
    多文件上传入口：保存原始文件 -> 调用摄取服务 -> 调用 AI 总结 -> 写入数据库。
    """
    if not files:
        raise HTTPException(status_code=400, detail="至少上传一个文件")

    if category_id is not None:
        category_exists = db.get(Category, category_id)
        if category_exists is None:
            raise HTTPException(status_code=404, detail=f"分类不存在: {category_id}")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    results: List[UploadItemResponse] = []
    completed = 0
    failed = 0

    for upload_file in files:
        original_name = upload_file.filename or "untitled"
        note = Note(
            title=Path(original_name).stem or "未命名笔记",
            status="processing",
            category_id=category_id,
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        saved_path: Optional[Path] = None
        try:
            file_bytes = await upload_file.read()
            if not file_bytes:
                raise IngestionError("上传文件为空，无法处理")

            saved_path = _save_upload_file(filename=original_name, content=file_bytes)
            note.original_path = str(saved_path)
            db.add(note)
            db.commit()
            db.refresh(note)

            ingestion_result = ingest_file(
                file_path=saved_path,
                mime_type=upload_file.content_type,
                filename=original_name,
            )
            llm_result = summarize_text(
                text=ingestion_result.extracted_text,
                media_type=ingestion_result.media_type,
                filename=original_name,
            )

            note.media_type = ingestion_result.media_type
            note.content = ingestion_result.extracted_text
            note.title = str(llm_result.get("title") or note.title)
            note.summary = str(llm_result.get("summary") or "")
            note.status = "completed"
            note.error_message = None

            suggested_tags = _normalize_tags(llm_result.get("suggested_tags", []))
            if suggested_tags:
                note.tags = [_get_or_create_tag(db=db, tag_name=tag_name) for tag_name in suggested_tags]

            db.add(note)
            db.commit()
            db.refresh(note)

            results.append(
                UploadItemResponse(
                    note_id=note.id,
                    filename=original_name,
                    status=note.status,
                    message="处理完成",
                    media_type=note.media_type,
                    suggested_tags=[tag.name for tag in note.tags],
                )
            )
            completed += 1
        except IngestionError as exc:
            _mark_note_failed(db=db, note_id=note.id, error_message=str(exc), saved_path=saved_path)
            results.append(
                UploadItemResponse(
                    note_id=note.id,
                    filename=original_name,
                    status="failed",
                    message=str(exc),
                )
            )
            failed += 1
        except Exception:
            # 防止内部异常泄露细节，同时将失败状态稳定落库。
            _mark_note_failed(
                db=db,
                note_id=note.id,
                error_message="处理流水线异常，请稍后重试",
                saved_path=saved_path,
            )
            results.append(
                UploadItemResponse(
                    note_id=note.id,
                    filename=original_name,
                    status="failed",
                    message="处理流水线异常，请稍后重试",
                )
            )
            failed += 1
        finally:
            await upload_file.close()

    return UploadBatchResponse(
        total=len(files),
        completed=completed,
        failed=failed,
        results=results,
    )


def _save_upload_file(filename: str, content: bytes) -> Path:
    safe_suffix = Path(filename).suffix[:10]
    stored_name = f"{uuid4().hex}{safe_suffix}"
    target_path = UPLOAD_ROOT / stored_name
    target_path.write_bytes(content)
    return target_path


def _normalize_tags(raw_tags: object) -> List[str]:
    if not isinstance(raw_tags, list):
        return []

    normalized: List[str] = []
    for item in raw_tags:
        value = str(item).strip()
        if not value:
            continue
        normalized.append(value[:50])
    return list(dict.fromkeys(normalized))


def _tag_color(tag_name: str) -> str:
    palette = [
        "#3B82F6",
        "#10B981",
        "#8B5CF6",
        "#F59E0B",
        "#EF4444",
        "#06B6D4",
    ]
    return palette[hash(tag_name) % len(palette)]


def _get_or_create_tag(db: Session, tag_name: str) -> Tag:
    existing = db.execute(select(Tag).where(Tag.name == tag_name)).scalar_one_or_none()
    if existing is not None:
        return existing

    new_tag = Tag(name=tag_name, color=_tag_color(tag_name))
    db.add(new_tag)
    db.flush()
    return new_tag


def _mark_note_failed(db: Session, note_id: int, error_message: str, saved_path: Optional[Path]):
    db.rollback()
    note = db.get(Note, note_id)
    if note is None:
        return

    note.status = "failed"
    note.error_message = error_message
    if saved_path is not None and not note.original_path:
        note.original_path = str(saved_path)
    db.add(note)
    db.commit()

