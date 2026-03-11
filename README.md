# OmniNote

个人智能知识库系统 - 支持多模态输入（截图、文字、文档、视频、音频），通过 AI 自动提取内容、生成总结，归档到类 Notability 的文件夹和标签体系。

## 技术栈

- **前端**: Next.js (App Router), TypeScript, Tailwind CSS, Zustand
- **后端**: Python FastAPI, SQLAlchemy
- **数据库**: PostgreSQL, ChromaDB（向量检索预留）

## 项目结构（Phase 4）

```
OmniNote/
├── app/                 # Next.js App Router
├── components/          # 前端组件
├── backend/             # FastAPI 后端
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── system.py    # 健康检查等系统路由
│   │   │       ├── notes.py     # 笔记列表/详情/轮询/媒体访问
│   │   │       ├── taxonomy.py  # 分类与标签接口
│   │   │       └── upload.py    # 上传与处理流水线入口
│   │   ├── config.py            # 应用配置
│   │   ├── database.py          # SQLAlchemy 连接/会话
│   │   ├── models.py            # 数据模型 (Category, Tag, Note)
│   │   ├── schemas.py           # Pydantic 序列化模型
│   │   ├── services/
│   │   │   ├── ingestion.py     # MIME 分发与摄取入口
│   │   │   ├── ai_summarizer.py # Mock LLM 总结与打标
│   │   │   └── extractors/
│   │   │       ├── audio_video.py
│   │   │       ├── image_ocr.py
│   │   │       └── document.py
│   │   └── main.py              # FastAPI 应用入口
│   └── requirements.txt
└── package.json         # 前端依赖
```

## 快速开始

### 1. 准备数据库

创建 PostgreSQL 数据库：

```bash
createdb omninote
```

### 2. 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
# 复制 .env.example 为 .env 并修改 DATABASE_URL
python run.py
```

API 运行在 http://localhost:8001

### 后端测试

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

### 3. 前端

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 关键接口

- `GET /api/categories`：获取分类
- `POST /api/categories`：创建分类
- `GET /api/tags`：获取标签
- `POST /api/tags`：创建标签
- `POST /api/upload`：多文件上传（异步处理）
- `GET /api/notes`：获取笔记列表
- `GET /api/notes/status?ids=1,2`：轮询处理状态
- `GET /api/notes/{id}`：笔记详情
- `GET /api/notes/{id}/media`：原始媒体预览

## Phase 进度

- [x] **Phase 1**: 基础骨架与数据库定义
- [x] Phase 2: 核心 UI 与前端逻辑
- [x] Phase 3: 后端上传与处理流
- [x] Phase 4: 联调与展示
