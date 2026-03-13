# Memora

个人智能知识库系统 - 支持多模态输入（截图、文字、文档、视频、音频），通过 AI 自动提取内容、生成总结，归档到类 Notability 的文件夹和标签体系。

## 技术栈

- **前端**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Lucide React
- **后端**: Python FastAPI, SQLAlchemy
- **数据库**: SQLite（开发）/ PostgreSQL（生产）
- **AI**: LLM 摘要（支持 DashScope/OpenAI 兼容接口）

---

## 快速启动

### 后端 (端口 8001)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
# 可选：复制 .env.example 为 .env，配置 LLM_API_KEY 等
python run.py
```

或使用脚本：`./scripts/start-backend.ps1`

### 前端 (端口 3000)

```bash
npm install
npm run dev
```

或使用脚本：`./scripts/start-frontend.ps1`

访问 **http://localhost:3000**（若端口占用会自动尝试 3001、3002 等）

---

## 已完成功能

### 后端 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/process` | POST | 多模态解析（不保存） |
| `/api/upload` | POST | 上传 → 解析 → LLM 摘要 → 保存到 DB |
| `/api/categories` | GET/POST | 分类列表与创建 |
| `/api/tags` | GET/POST | 标签列表与创建 |
| `/api/notes` | GET | 笔记列表（支持 `?category_id=` 筛选） |
| `/api/notes/{id}` | GET | 笔记详情 |
| `/api/files/{filename}` | GET | 访问上传的原始文件 |

### 多模态解析 Pipeline

- **文本**: txt, md, json → 直接透传
- **文档**: PDF (PyMuPDF)、Word (python-docx)
- **图片**: OCR/Vision LLM 预留（可 mock）
- **音视频**: FFmpeg 抽音 + Whisper 转写（可 mock）

### 前端界面

- **左侧边栏**: 新建/上传、全部笔记、分类树、标签
- **中间列表**: 搜索、类型筛选、笔记卡片流
- **右侧详情**: 媒体预览、AI 摘要、Markdown 风格内容渲染

### 数据库模型

- **Category**: 分类（支持层级）
- **Tag**: 标签（多对多）
- **Note**: 笔记（媒体类型、摘要、内容、关联）

---

## 项目结构

```
Memora/
├── app/                    # Next.js 页面
├── components/             # 前端组件
│   ├── layout/             # Sidebar, MainArea
│   ├── notes/              # NoteCard, NoteDetail
│   └── upload/             # UploadZone
├── lib/                    # API 客户端
├── store/                  # Zustand 状态
├── backend/
│   ├── app/
│   │   ├── api/routes.py   # API 路由
│   │   ├── core/config.py  # 配置
│   │   ├── services/       # 解析器、摘要、笔记服务
│   │   ├── models.py       # 数据库模型
│   │   └── schemas/        # Pydantic 模型
│   └── run.py
└── package.json
```

---

## 环境变量 (backend/.env)

```
DATABASE_URL=sqlite:///./memora.db
LLM_API_KEY=sk-xxx
LLM_API_BASE=https://coding.dashscope.aliyuncs.com/v1
LLM_MODEL=qwen3.5-plus
UPLOAD_DIR=uploads
```
