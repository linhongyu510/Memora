"""
笔记查询与状态轮询路由。
"""

import mimetypes
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ...database import get_db
from ...models import Note
from ...schemas import NoteResponse, NoteStatusBatchResponse, NoteStatusItem

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=List[NoteResponse])
def list_notes(
    category_id: Optional[int] = Query(default=None),
    tag_ids: Optional[str] = Query(default=None, description="逗号分隔，如 1,2"),
    db: Session = Depends(get_db),
):
    """
    获取笔记列表，支持分类和标签过滤。
    """
    query = select(Note).options(selectinload(Note.tags)).order_by(Note.created_at.desc())
    if category_id is not None:
        query = query.where(Note.category_id == category_id)

    notes = list(db.execute(query).scalars().all())
    parsed_tag_ids = _parse_ids(tag_ids)
    if parsed_tag_ids:
        wanted = set(parsed_tag_ids)
        notes = [note for note in notes if wanted.issubset({tag.id for tag in note.tags})]

    return notes


@router.get("/status", response_model=NoteStatusBatchResponse)
def poll_note_status(ids: str = Query(..., description="逗号分隔 note_id"), db: Session = Depends(get_db)):
    """
    轮询接口：前端可持续查询一批笔记的处理状态。
    """
    note_ids = _parse_ids(ids)
    if not note_ids:
        raise HTTPException(status_code=400, detail="ids 参数无效")

    rows = db.execute(select(Note).where(Note.id.in_(note_ids))).scalars().all()
    by_id = {note.id: note for note in rows}

    items: List[NoteStatusItem] = []
    for note_id in note_ids:
        note = by_id.get(note_id)
        if note is None:
            items.append(NoteStatusItem(note_id=note_id, status="not_found", error_message="笔记不存在"))
            continue
        items.append(
            NoteStatusItem(
                note_id=note.id,
                status=note.status,
                error_message=note.error_message,
            )
        )

    return NoteStatusBatchResponse(items=items)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note_detail(note_id: int, db: Session = Depends(get_db)):
    """
    获取单条笔记详情。
    """
    note = db.execute(
        select(Note).where(Note.id == note_id).options(selectinload(Note.tags))
    ).scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return note


@router.get("/{note_id}/media")
def get_note_media(note_id: int, db: Session = Depends(get_db)):
    """
    原始媒体访问入口，供前端详情页预览使用。
    """
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="笔记不存在")
    if not note.original_path:
        raise HTTPException(status_code=404, detail="该笔记无原始媒体")

    media_path = Path(note.original_path)
    if not media_path.exists() or not media_path.is_file():
        raise HTTPException(status_code=404, detail="媒体文件不存在")

    media_type = mimetypes.guess_type(str(media_path))[0] or "application/octet-stream"
    return FileResponse(path=media_path, media_type=media_type, filename=media_path.name)


def _parse_ids(raw_ids: Optional[str]) -> List[int]:
    if not raw_ids:
        return []
    parsed: List[int] = []
    for part in raw_ids.split(","):
        item = part.strip()
        if not item:
            continue
        if not item.isdigit():
            continue
        parsed.append(int(item))
    return list(dict.fromkeys(parsed))

