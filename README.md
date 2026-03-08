# OmniNote

个人智能知识库系统 - 支持多模态输入（截图、文字、文档、视频、音频），通过 AI 自动提取内容、生成总结，归档到类 Notability 的文件夹和标签体系。

## 技术栈

- **前端**: Next.js (App Router), TypeScript, Tailwind CSS, Zustand
- **后端**: Python FastAPI, SQLAlchemy
- **数据库**: PostgreSQL, ChromaDB（向量检索预留）

## 项目结构（Phase 1）

```
OmniNote/
├── app/                 # Next.js App Router
├── components/          # 前端组件
├── backend/             # FastAPI 后端
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── system.py    # 健康检查等系统路由
│   │   ├── config.py            # 应用配置
│   │   ├── database.py          # SQLAlchemy 连接/会话
│   │   ├── models.py            # 数据模型 (Category, Tag, Note)
│   │   ├── schemas.py           # Pydantic 序列化模型
│   │   └── main.py              # FastAPI 应用入口
│   └── requirements.txt
└── package.json         # 前端依赖
```

## 快速开始

### 1. 准备数据库

创建 PostgreSQL 数据库：

```bash
createdb memora
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

### 3. 前端

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## Phase 进度

- [x] **Phase 1**: 基础骨架与数据库定义
- [ ] Phase 2: 核心 UI 与前端逻辑
- [ ] Phase 3: 后端上传与处理流
- [ ] Phase 4: 联调与展示
