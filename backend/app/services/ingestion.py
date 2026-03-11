"""
文件摄取与解析分发服务。

职责：
1) 根据 MIME type / 扩展名识别媒体类型
2) 路由到对应提取器（音视频、图片 OCR、文档解析）
3) 返回统一的提取结果
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..models import MediaType
from .extractors.audio_video import extract_from_audio_or_video
from .extractors.document import extract_from_document
from .extractors.image_ocr import extract_from_image


class IngestionError(Exception):
    """文件摄取失败异常。"""


@dataclass
class IngestionResult:
    """统一的解析结果结构。"""

    media_type: MediaType
    extracted_text: str
    extractor_name: str


def detect_media_type(mime_type: Optional[str], filename: str) -> MediaType:
    """
    基于 MIME 与扩展名推断媒体类型。
    """
    normalized_mime = (mime_type or "").lower()
    suffix = Path(filename).suffix.lower()

    if normalized_mime.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        return MediaType.IMAGE
    if normalized_mime.startswith("audio/") or suffix in {".mp3", ".wav", ".m4a", ".aac"}:
        return MediaType.AUDIO
    if normalized_mime.startswith("video/") or suffix in {".mp4", ".mov", ".mkv", ".webm"}:
        return MediaType.VIDEO
    if (
        "pdf" in normalized_mime
        or "word" in normalized_mime
        or suffix in {".pdf", ".doc", ".docx", ".ppt", ".pptx"}
    ):
        return MediaType.DOCUMENT
    if normalized_mime.startswith("text/") or suffix in {".txt", ".md"}:
        return MediaType.TEXT

    raise IngestionError(f"暂不支持的文件类型: mime={mime_type}, filename={filename}")


def ingest_file(file_path: Path, mime_type: Optional[str], filename: str) -> IngestionResult:
    """
    将文件路由到对应提取器，返回统一结果。
    """
    media_type = detect_media_type(mime_type=mime_type, filename=filename)
    safe_mime = mime_type or "application/octet-stream"

    if media_type in {MediaType.AUDIO, MediaType.VIDEO}:
        text = extract_from_audio_or_video(file_path=file_path, mime_type=safe_mime)
        return IngestionResult(media_type=media_type, extracted_text=text, extractor_name="audio_video")

    if media_type == MediaType.IMAGE:
        text = extract_from_image(file_path=file_path, mime_type=safe_mime)
        return IngestionResult(media_type=media_type, extracted_text=text, extractor_name="image_ocr")

    if media_type == MediaType.DOCUMENT:
        text = extract_from_document(file_path=file_path, mime_type=safe_mime)
        return IngestionResult(media_type=media_type, extracted_text=text, extractor_name="document")

    # 文本文件直接读取（边界：解码失败时抛出明确错误信息）
    if media_type == MediaType.TEXT:
        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise IngestionError("文本文件编码不是 UTF-8，当前版本暂不支持自动转码") from exc
        if not text.strip():
            raise IngestionError("文本文件为空，无法提取有效内容")
        return IngestionResult(media_type=media_type, extracted_text=text, extractor_name="plain_text")

    raise IngestionError(f"未知媒体类型: {media_type}")

