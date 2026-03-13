"""
数据库实体模型 - Category, Tag, Note 及其关联关系
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


# ============ 枚举：笔记媒体类型 ============
class MediaType(str, enum.Enum):
    """多模态输入的媒体类型"""
    TEXT = "text"       # 纯文本
    IMAGE = "image"     # 图片/截图
    DOCUMENT = "document"  # PDF/Word 文档
    AUDIO = "audio"     # 音频
    VIDEO = "video"     # 视频


# ============ 多对多关联表：笔记-标签 ============
note_tag_association = Table(
    "note_tag",
    Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


# ============ 分类模型 ============
class Category(Base):
    """
    分类 - 类似 Notability 的文件夹层级结构
    支持父子层级（parent_id 自关联）
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0)  # 拖拽排序用
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 自关联：子分类
    children = relationship("Category", back_populates="parent", foreign_keys=[parent_id])
    parent = relationship("Category", back_populates="children", remote_side=[id])

    # 该分类下的笔记
    notes = relationship("Note", back_populates="category", foreign_keys="Note.category_id")


# ============ 标签模型 ============
class Tag(Base):
    """
    标签 - 用于笔记的多维度分类
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(20), default="#3B82F6")  # 标签颜色，支持 UI 展示
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 多对多：拥有该标签的笔记
    notes = relationship("Note", secondary=note_tag_association, back_populates="tags")


# ============ 笔记模型 ============
class Note(Base):
    """
    笔记 - 核心实体
    存储多模态输入的元数据、AI 提取/总结内容
    """
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=True)  # AI 生成的简短摘要
    content = Column(Text, nullable=True)   # AI 提取的完整文本 / 可编辑的 Markdown

    # 多模态相关
    media_type = Column(Enum(MediaType), default=MediaType.TEXT)
    original_path = Column(String(500), nullable=True)  # 原始文件存储路径
    thumbnail_path = Column(String(500), nullable=True)  # 缩略图（可选）

    # 处理状态
    status = Column(String(20), default="pending")  # pending | processing | completed | failed
    error_message = Column(Text, nullable=True)     # 解析失败时的错误信息

    # 外键
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关联
    category = relationship("Category", back_populates="notes")
    tags = relationship("Tag", secondary=note_tag_association, back_populates="notes")


# ============ 系统配置模型 ============
class SystemConfig(Base):
    """
    系统配置 - 用于在数据库中持久化 key/value 设置（如 LLM API Key、Base URL、模型名等）。

    注意：当前不做加密存储，仅通过 is_secret 标记，API 响应会避免直接返回敏感值。
    """

    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    key = Column(String(100), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)
    is_secret = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
