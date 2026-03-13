"""
文件分派器 - 根据 content_type / 后缀 选择对应 Parser 并提取文本
"""
from typing import Optional
from app.schemas.pipeline import ParsedContent, MediaType
from .parsers import TextParser, DocumentParser, ImageParser, AudioParser


# MIME 到 Parser 的映射
_MIME_TO_PARSER = {
    "text/plain": TextParser,
    "text/markdown": TextParser,
    "text/html": TextParser,
    "application/json": TextParser,
    "application/pdf": DocumentParser,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentParser,
    # application/msword (.doc) 需额外转换，暂不支持
    "image/png": ImageParser,
    "image/jpeg": ImageParser,
    "image/jpg": ImageParser,
    "image/gif": ImageParser,
    "image/webp": ImageParser,
    "audio/mpeg": AudioParser,
    "audio/mp3": AudioParser,
    "audio/wav": AudioParser,
    "audio/x-wav": AudioParser,
    "audio/m4a": AudioParser,
    "audio/webm": AudioParser,
    "video/mp4": AudioParser,
    "video/webm": AudioParser,
    "video/x-matroska": AudioParser,
}

# 后缀到 Parser 的兜底映射（当 MIME 不可靠时）
_EXT_TO_PARSER = {
    ".txt": TextParser,
    ".md": TextParser,
    ".json": TextParser,
    ".pdf": DocumentParser,
    ".docx": DocumentParser,
    ".png": ImageParser,
    ".jpg": ImageParser,
    ".jpeg": ImageParser,
    ".gif": ImageParser,
    ".webp": ImageParser,
    ".mp3": AudioParser,
    ".wav": AudioParser,
    ".m4a": AudioParser,
    ".mp4": AudioParser,
    ".webm": AudioParser,
    ".mkv": AudioParser,
    ".avi": AudioParser,
    ".mov": AudioParser,
}


def _get_parser(content_type: Optional[str], filename: str):
    """根据 content_type 或 filename 获取 Parser 类"""
    # 1. 优先用 content_type（需归一化，如去除 charset）
    if content_type:
        mime = content_type.split(";")[0].strip().lower()
        parser_cls = _MIME_TO_PARSER.get(mime)
        if parser_cls:
            return parser_cls()

    # 2. 兜底：根据后缀
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    parser_cls = _EXT_TO_PARSER.get(ext)
    if parser_cls:
        return parser_cls()

    raise ValueError(
        f"不支持的文件类型: content_type={content_type}, filename={filename}。"
        "支持的格式: txt/md/pdf/docx、png/jpg、mp3/wav/mp4 等"
    )


async def process_file(
    file_bytes: bytes,
    filename: str,
    content_type: Optional[str] = None,
) -> ParsedContent:
    """
    接收文件，路由到对应 Parser，返回提取的 ParsedContent

    Args:
        file_bytes: 文件二进制
        filename: 文件名
        content_type: MIME 类型，如 application/pdf

    Returns:
        ParsedContent

    Raises:
        ValueError: 不支持的类型或解析失败
    """
    parser = _get_parser(content_type, filename)
    return await parser.extract(file_bytes, filename)
