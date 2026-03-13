"""
OpenAI-compatible client helpers for text, vision and transcription workloads.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings


class AIConfigurationError(ValueError):
    """Raised when the project lacks enough configuration to call an AI endpoint."""


@dataclass(frozen=True)
class AIClientConfig:
    api_key: str
    base_url: Optional[str]
    model: str


def _default_base_url(model: str) -> Optional[str]:
    if "deepseek" in model.lower():
        return "https://api.deepseek.com"
    return None


def _build_config(
    *,
    api_key: Optional[str],
    base_url: Optional[str],
    model: Optional[str],
    fallback_api_key: Optional[str],
    fallback_base_url: Optional[str],
    fallback_model: Optional[str],
    missing_message: str,
) -> AIClientConfig:
    resolved_api_key = (api_key or fallback_api_key or "").strip()
    if not resolved_api_key:
        raise AIConfigurationError(missing_message)

    resolved_model = (model or fallback_model or "").strip()
    if not resolved_model:
        raise AIConfigurationError("缺少模型配置，请检查相关环境变量。")

    resolved_base_url = (base_url or fallback_base_url or "").strip() or _default_base_url(resolved_model)
    return AIClientConfig(
        api_key=resolved_api_key,
        base_url=resolved_base_url,
        model=resolved_model,
    )


def get_text_client_config() -> AIClientConfig:
    settings = get_settings()
    return _build_config(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_API_BASE,
        model=settings.LLM_MODEL,
        fallback_api_key=None,
        fallback_base_url=None,
        fallback_model=None,
        missing_message="未配置 LLM_API_KEY，无法调用文本大模型。",
    )


def get_vision_client_config() -> AIClientConfig:
    settings = get_settings()
    return _build_config(
        api_key=settings.VISION_API_KEY,
        base_url=settings.VISION_API_BASE,
        model=settings.VISION_MODEL,
        fallback_api_key=settings.LLM_API_KEY,
        fallback_base_url=settings.LLM_API_BASE,
        fallback_model=settings.LLM_MODEL,
        missing_message="未配置 VISION_API_KEY 或 LLM_API_KEY，无法调用视觉模型。",
    )


def get_transcription_client_config() -> AIClientConfig:
    settings = get_settings()
    return _build_config(
        api_key=settings.TRANSCRIPTION_API_KEY,
        base_url=settings.TRANSCRIPTION_API_BASE,
        model=settings.TRANSCRIPTION_MODEL,
        fallback_api_key=settings.LLM_API_KEY,
        fallback_base_url=settings.LLM_API_BASE,
        fallback_model=None,
        missing_message="未配置 TRANSCRIPTION_API_KEY 或 LLM_API_KEY，无法调用语音转写模型。",
    )
