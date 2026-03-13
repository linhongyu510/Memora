"""
System settings schemas.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    llm_api_base: str | None = None
    llm_model: str | None = None
    llm_api_key_set: bool = False
    llm_api_key_masked: str | None = None


class SettingsUpdate(BaseModel):
    llm_api_base: str | None = Field(default=None, description="LLM API Base URL (OpenAI-compatible). Empty means reset.")
    llm_model: str | None = Field(default=None, description="LLM model name. Empty means reset.")
    llm_api_key: str | None = Field(default=None, description="LLM API key. Leave empty to keep current.")
    clear_llm_api_key: bool = Field(default=False, description="Clear stored API key.")
