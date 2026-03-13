"""
纯文本 / Markdown 解析器 - 直接透传，无需外部依赖
"""
from app.schemas.pipeline import ParsedContent, MediaType
from .base import BaseParser


class TextParser(BaseParser):
    """处理 .txt, .md, .json 等纯文本文件"""

    @property
    def media_type(self) -> MediaType:
        return MediaType.TEXT

    async def extract(self, file_bytes: bytes, filename: str) -> ParsedContent:
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                raw_text = file_bytes.decode("gbk")
            except UnicodeDecodeError:
                raise ValueError("无法解码文本文件，请确保为 UTF-8 或 GBK 编码")

        return ParsedContent(
            raw_text=raw_text.strip(),
            media_type=self.media_type,
            filename=filename,
        )
