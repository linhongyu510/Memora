"""
多模态解析器 - 策略模式，根据文件类型选用对应 Parser
"""
from .base import BaseParser
from .text import TextParser
from .document import DocumentParser
from .image import ImageParser
from .audio import AudioParser

__all__ = [
    "BaseParser",
    "TextParser",
    "DocumentParser",
    "ImageParser",
    "AudioParser",
]
