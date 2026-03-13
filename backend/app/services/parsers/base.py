"""
Parser 抽象基类 - 定义统一的 extract 接口
"""
from abc import ABC, abstractmethod
from app.schemas.pipeline import ParsedContent, MediaType


class BaseParser(ABC):
    """所有解析器的抽象基类"""

    @property
    @abstractmethod
    def media_type(self) -> MediaType:
        """该解析器处理的媒体类型"""
        pass

    @abstractmethod
    async def extract(self, file_bytes: bytes, filename: str) -> ParsedContent:
        """
        从文件字节中提取文本内容

        Args:
            file_bytes: 文件二进制数据
            filename: 原始文件名（用于推断格式、日志）

        Returns:
            ParsedContent: 包含 raw_text 和 media_type

        Raises:
            ValueError: 解析失败时抛出，如格式不支持、文件损坏
        """
        pass
