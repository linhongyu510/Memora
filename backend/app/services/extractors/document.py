"""
文档提取器（Mock）。
"""

from pathlib import Path


def extract_from_document(file_path: Path, mime_type: str) -> str:
    """
    模拟 PDF/Word 的正文解析。
    """
    return (
        f"[Mock Document Parser] 已完成文档解析\n"
        f"- 文件名: {file_path.name}\n"
        f"- MIME: {mime_type}\n"
        f"- 结果: 这是一段模拟的文档正文，后续可替换为真实解析器输出。"
    )

