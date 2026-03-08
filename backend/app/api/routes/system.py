"""
系统基础路由：健康检查等。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    """API 健康检查。"""
    return {"status": "healthy"}

