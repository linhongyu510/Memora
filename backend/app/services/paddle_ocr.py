"""
Lightweight PaddleOCR wrapper with lazy loading.

The parser layer depends on this module instead of importing PaddleOCR directly,
so test environments can run without heavy OCR wheels installed.
"""

from __future__ import annotations

import io
from functools import lru_cache
from typing import Iterable


class PaddleOCRUnavailableError(RuntimeError):
    """Raised when PaddleOCR or its runtime dependencies are unavailable."""


def _flatten_text_candidates(value) -> Iterable[str]:
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if isinstance(value, dict):
        texts: list[str] = []
        for key in ("rec_texts", "texts", "text"):
            current = value.get(key)
            if isinstance(current, str):
                texts.append(current)
            elif isinstance(current, list):
                for item in current:
                    texts.extend(_flatten_text_candidates(item))
        for item in value.values():
            if isinstance(item, (list, tuple, dict)):
                texts.extend(_flatten_text_candidates(item))
        return texts

    if isinstance(value, tuple):
        if len(value) == 2 and isinstance(value[0], str):
            return [value[0]]
        texts: list[str] = []
        for item in value:
            texts.extend(_flatten_text_candidates(item))
        return texts

    if isinstance(value, list):
        texts: list[str] = []
        for item in value:
            texts.extend(_flatten_text_candidates(item))
        return texts

    return []


@lru_cache(maxsize=1)
def _get_paddle_ocr():
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise PaddleOCRUnavailableError(
            "PaddleOCR 未安装。请安装 backend/requirements.txt 中的 paddlepaddle 与 paddleocr 依赖。"
        ) from exc

    from app.core.config import get_settings

    settings = get_settings()
    return PaddleOCR(
        use_angle_cls=settings.PADDLE_OCR_USE_ANGLE_CLS,
        lang=settings.PADDLE_OCR_LANG,
        show_log=False,
    )


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """
    Run OCR on an image payload and return normalized plain text.
    """
    try:
        import numpy as np
        from PIL import Image
    except ImportError as exc:
        raise PaddleOCRUnavailableError(
            "PaddleOCR 运行所需的 Pillow / numpy 不可用。"
        ) from exc

    ocr = _get_paddle_ocr()

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"无法解码图片内容: {exc}") from exc

    image_array = np.array(image)

    try:
        result = ocr.ocr(image_array, cls=True)
    except Exception as exc:
        raise RuntimeError(f"PaddleOCR 识别失败: {exc}") from exc

    candidates = [text.strip() for text in _flatten_text_candidates(result) if text and text.strip()]
    deduplicated: list[str] = []
    for item in candidates:
        if item not in deduplicated:
            deduplicated.append(item)

    return "\n".join(deduplicated).strip()
