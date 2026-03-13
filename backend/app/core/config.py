"""
环境变量配置 - API Keys、LLM 端点等
# 需要: pip install pydantic-settings python-dotenv
"""
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

# 确保 .env 从 backend 目录加载（uvicorn 可能从不同 cwd 启动）
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """应用配置类 - 支持 .env 环境变量"""

    # 数据库
    DATABASE_URL: str = "sqlite:///./memora.db"

    # 应用
    APP_NAME: str = "Memora API"
    DEBUG: bool = False

    # LLM 配置 (DeepSeek / OpenAI 兼容)
    # DeepSeek: https://api.deepseek.com
    # OpenAI:   https://api.openai.com
    LLM_API_BASE: Optional[str] = None  # 不填则用默认
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "deepseek-chat"  # deepseek-chat / gpt-4o / 等

    # PaddleOCR 配置
    PADDLE_OCR_LANG: str = "ch"
    PADDLE_OCR_USE_ANGLE_CLS: bool = True

    # Whisper 配置（音视频转写）
    WHISPER_MODEL: str = "base"  # tiny / base / small / medium / large

    # 上传文件存储目录（相对 backend 目录）
    UPLOAD_DIR: str = "uploads"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug"}:
                return True
        return value

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """获取缓存的配置实例"""
    return Settings()
