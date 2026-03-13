"""
图片解析器 - OCR / Vision LLM 提取图中文字

策略：
1) 优先使用本地 PaddleOCR（更稳定、低成本、离线可用）。
2) 若 PaddleOCR 不可用，则尝试 Vision LLM（OpenAI 兼容接口）。
3) 最后可选回退到 Tesseract（若已安装），否则返回占位文本。
"""

from __future__ import annotations

import base64
from pathlib import Path

from app.schemas.pipeline import ParsedContent, MediaType
from app.services.paddle_ocr import PaddleOCRUnavailableError, extract_text_from_image_bytes
from .base import BaseParser


VISION_PROMPT = (
    "请识别图片中的全部文字内容，直接输出识别到的文本，不要添加解释。"
    "若图片中没有文字，请简洁描述图片主要内容（1-3 句）。"
)


class ImageParser(BaseParser):
    @property
    def media_type(self) -> MediaType:
        return MediaType.IMAGE

    def _guess_mime(self, filename: str) -> str:
        suffix = Path(filename).suffix.lower()
        return {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(suffix, "image/png")

    def _ocr_tesseract(self, file_bytes: bytes) -> str:
        import io
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            return ""
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img, lang="chi_sim+eng")

    def _vision_mock(self, file_bytes: bytes, filename: str) -> str:
        return f"[图片内容占位] 文件名: {filename}，尺寸约 {len(file_bytes)} 字节。"

    async def _vision_api(self, file_bytes: bytes, filename: str) -> str:
        from app.core.config import get_settings

        settings = get_settings()
        if not settings.LLM_API_KEY:
            return ""

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_API_BASE or "https://api.openai.com/v1",
            )

            data_url = f"data:{self._guess_mime(filename)};base64,{base64.b64encode(file_bytes).decode('utf-8')}"

            resp = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": VISION_PROMPT},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                max_tokens=4096,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception:
            return ""

    async def extract(self, file_bytes: bytes, filename: str) -> ParsedContent:
        raw_text = ""

        try:
            raw_text = extract_text_from_image_bytes(file_bytes)
        except PaddleOCRUnavailableError:
            raw_text = ""
        except Exception:
            raw_text = ""

        if not raw_text:
            raw_text = await self._vision_api(file_bytes, filename)

        if not raw_text:
            try:
                raw_text = (self._ocr_tesseract(file_bytes) or "").strip()
            except Exception:
                pass

        if not raw_text:
            raw_text = self._vision_mock(file_bytes, filename)

        return ParsedContent(
            raw_text=raw_text,
            media_type=self.media_type,
            filename=filename,
        )

