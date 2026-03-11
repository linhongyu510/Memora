"""
分类与标签（Taxonomy）路由。
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Category, Tag
from ...schemas import CategoryCreate, CategoryResponse, TagCreate, TagResponse

router = APIRouter(prefix="/api", tags=["taxonomy"])


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """获取分类列表（按 parent_id + sort_order 排序）。"""
    rows = db.execute(
        select(Category).order_by(
            case((Category.parent_id.is_(None), 0), else_=1),
            Category.parent_id.asc(),
            Category.sort_order.asc(),
            Category.id.asc(),
        )
    ).scalars()
    return list(rows)


@router.post("/categories", response_model=CategoryResponse)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    """创建分类。"""
    normalized_name = payload.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="分类名不能为空")

    if payload.parent_id is not None:
        parent = db.get(Category, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=404, detail=f"父分类不存在: {payload.parent_id}")

    category = Category(
        name=normalized_name,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/tags", response_model=List[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    """获取标签列表。"""
    rows = db.execute(select(Tag).order_by(Tag.sort_order.asc(), Tag.id.asc())).scalars()
    return list(rows)


@router.post("/tags", response_model=TagResponse)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    """创建标签（同名去重）。"""
    normalized_name = payload.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="标签名不能为空")

    exists = db.execute(select(Tag).where(Tag.name == normalized_name)).scalar_one_or_none()
    if exists is not None:
        return exists

    tag = Tag(name=normalized_name, color=payload.color or "#3B82F6", sort_order=payload.sort_order)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

