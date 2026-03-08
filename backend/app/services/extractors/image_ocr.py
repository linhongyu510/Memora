"""
图片 OCR 提取器（Mock）。
"""

from pathlib import Path


def extract_from_image(file_path: Path, mime_type: str) -> str:
    """
    模拟 Vision LLM / OCR 识别图片文本。
    """
    return (
        f"[Mock OCR] 已完成图文提取\n"
        f"- 文件名: {file_path.name}\n"
        f"- MIME: {mime_type}\n"
        f"- 结果: 这是一段模拟的 OCR 文本，包含截图中的关键内容。"
    )

