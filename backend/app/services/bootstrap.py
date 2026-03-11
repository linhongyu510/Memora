"""
应用启动初始化逻辑。
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Category, Tag


DEFAULT_CATEGORIES = [
    {"name": "学习", "parent_name": None, "sort_order": 0},
    {"name": "项目", "parent_name": None, "sort_order": 1},
    {"name": "AI 研究", "parent_name": "学习", "sort_order": 0},
    {"name": "前端工程", "parent_name": "学习", "sort_order": 1},
    {"name": "OmniNote", "parent_name": "项目", "sort_order": 0},
]

DEFAULT_TAGS = [
    {"name": "高优先级", "color": "#EF4444", "sort_order": 0},
    {"name": "待整理", "color": "#F59E0B", "sort_order": 1},
    {"name": "灵感", "color": "#3B82F6", "sort_order": 2},
    {"name": "会议", "color": "#10B981", "sort_order": 3},
]


def seed_initial_taxonomy(db: Session):
    """
    初始化默认分类和标签。
    若已有数据则不重复写入。
    """
    category_count = db.execute(select(func.count(Category.id))).scalar_one()
    tag_count = db.execute(select(func.count(Tag.id))).scalar_one()

    if category_count == 0:
        id_map: dict[str, int] = {}
        for item in DEFAULT_CATEGORIES:
            parent_id = id_map.get(item["parent_name"]) if item["parent_name"] else None
            row = Category(name=item["name"], parent_id=parent_id, sort_order=item["sort_order"])
            db.add(row)
            db.flush()
            id_map[item["name"]] = row.id

    if tag_count == 0:
        for item in DEFAULT_TAGS:
            db.add(Tag(name=item["name"], color=item["color"], sort_order=item["sort_order"]))

    db.commit()

