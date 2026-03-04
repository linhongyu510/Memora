"""
Memora / OmniNote - FastAPI 主入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="个人智能知识库 - 多模态输入、AI 提取与总结",
)

# CORS - 允许 Next.js 前端跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """启动时初始化数据库表（需导入 models 以注册表结构）"""
    from . import models  # noqa: F401
    init_db()


@app.get("/")
def root():
    """健康检查"""
    return {"message": "Memora API 运行中", "status": "ok"}


@app.get("/api/health")
def health():
    """API 健康检查"""
    return {"status": "healthy"}
