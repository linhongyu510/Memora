"""
应用配置 - 数据库连接与基础设置
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库（开发可用 sqlite:///./memora.db，生产用 PostgreSQL）
    DATABASE_URL: str = "sqlite:///./memora.db"
    
    # 应用
    APP_NAME: str = "Memora API"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """获取缓存的配置实例"""
    return Settings()
