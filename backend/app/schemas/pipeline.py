"""
Pipeline Pydantic 模型 - 解析结果与 LLM 输出
"""
from pydantic import BaseModel, Field
from typing import List
from enum import Enum


class MediaType(str, Enum):
    """多模态媒体类型，与 Parser 对应"""
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"


class ParsedContent(BaseModel):
    """解析器输出的原始内容"""

    raw_text: str = Field(..., description="提取的原始文本（OCR/转写/解析结果）")
    media_type: MediaType = Field(..., description="源文件媒体类型")
    filename: str = Field(default="", description="原始文件名")


class LLMResult(BaseModel):
    """大模型返回的结构化摘要与打标结果"""

    title: str = Field(..., description="提炼后的笔记标题，简洁有力")
    summary: str = Field(..., description="核心摘要，2-5 句话概括要点")
    suggested_tags: List[str] = Field(default_factory=list, description="建议标签列表")
    category: str = Field(default="", description="建议分类名，可为空")
