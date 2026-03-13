"""
Memora / OmniNote - FastAPI 主入口
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .core.config import get_settings, _BACKEND_DIR
from .api.routes import router

settings = get_settings()
UPLOADS_DIR = _BACKEND_DIR / settings.UPLOAD_DIR
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    docs_url="/docs",
    title=settings.APP_NAME,
    version="0.1.0",
    description="个人智能知识库 - 多模态输入、AI 提取与总结",
)

# CORS - 允许 Next.js 前端跨域（含备用端口）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    # 允许任意本机端口，避免前端端口变化导致浏览器报 "Failed to fetch"（CORS 拦截）。
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup_event():
    """启动时初始化数据库表、上传目录"""
    from . import models  # noqa: F401
    init_db()
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# 挂载上传文件静态服务（便于前端预览）
app.mount("/api/files", StaticFiles(directory=str(UPLOADS_DIR)), name="files")


@app.get("/")
def root():
    """健康检查"""
    return {"message": "Memora API 运行中", "status": "ok"}


@app.get("/api/health")
def health():
    """API 健康检查"""
    return {"status": "healthy"}
