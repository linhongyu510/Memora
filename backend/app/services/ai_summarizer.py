"""
AI 总结服务（Mock）。

输入：长文本 + 媒体类型 + 原始文件名
输出：结构化摘要 JSON
"""

from pathlib import Path
from typing import Dict, List

from ..models import MediaType


def summarize_text(text: str, media_type: MediaType, filename: str) -> Dict[str, object]:
    """
    模拟 LLM 总结并自动推荐标签。
    """
    stem = Path(filename).stem.strip() or "未命名笔记"
    short_text = text.strip().replace("\n", " ")
    if len(short_text) > 90:
        short_text = f"{short_text[:90]}..."

    suggested_tags = _suggest_tags(media_type=media_type, text=text)
    title = f"{stem} - AI 摘要"
    summary = f"已提取 {media_type.value} 内容：{short_text}"

    return {"title": title, "summary": summary, "suggested_tags": suggested_tags}


def _suggest_tags(media_type: MediaType, text: str) -> List[str]:
    """
    简单规则模拟 LLM 自动打标。
    """
    tags = ["AI整理"]
    lower_text = text.lower()

    if media_type in {MediaType.AUDIO, MediaType.VIDEO}:
        tags.append("会议")
    if media_type == MediaType.IMAGE:
        tags.append("截图")
    if media_type == MediaType.DOCUMENT:
        tags.append("文档")
    if "todo" in lower_text or "待办" in text:
        tags.append("待办")

    return tags

