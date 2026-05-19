# AlgoHub — 算法学习与刷题平台

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-✓-2496ED?logo=docker)](https://docker.com)

面向中国开发者的企业级算法刷题平台，对标 LeetCode。集**在线评测**、**AI 辅导**、**算法可视化**、**竞赛系统**于一体。

## 功能特性

| 模块 | 功能 |
|------|------|
| 📝 **题库** | 60+ 道精选题目，8 大算法分类，中文标签生态 |
| ⚡ **在线评测** | Python/C++/Java，Docker 沙箱隔离，SSE 实时推送 |
| 🤖 **AI 辅导** | DeepSeek 驱动，4 级渐进提示，错误分析 |
| 🎨 **可视化** | 5 种算法演示（双指针/排序/二分/BFS/DP），3 语言代码 |
| 🏆 **竞赛** | ACM 赛制周赛，实时排名+罚时，比赛锁定 |
| 📒 **笔记** | 个人私有笔记，Markdown，增删改查 |
| 💬 **广场** | 开源社区，Fork/Star/评论，笔记广场分离 |

## 技术栈

```
前端: Next.js 16 · React 19 · TailwindCSS v4 · shadcn/ui · Monaco Editor · framer-motion
后端: FastAPI · SQLAlchemy · Alembic · Celery · Redis · PostgreSQL
评测: Docker Sandbox · SSE Streaming · HMAC
AI:   DeepSeek API · SSE 流式 · Error Cache
部署: Docker Compose · Nginx · Vercel · Railway
```

## 快速开始

```bash
git clone https://github.com/wxccurry/algohub.git
cd algohub

# 后端
cd backend
pip install -r requirements.txt
alembic upgrade head
python scripts/import_problems.py data/problems_v1.json
uvicorn app.main:app --reload

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000

## Docker 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

## 管理员

```
用户名: admin
密码:   admin123
```

## 项目结构

```
platform/
├── frontend/          # Next.js 前端
│   ├── app/           # 题库/比赛/笔记/广场/可视化/管理
│   ├── components/    # UI + 编辑器 + AI 助手 + 可视化渲染器
│   └── hooks/         # useHotkeys · useScrollDirection · useSSE
├── backend/           # FastAPI 后端（Modular Monolith）
│   ├── app/modules/   # auth · problem · submission · contest · ai
│   ├── app/judge/     # 评测引擎 + Docker 沙箱
│   ├── alembic/       # 数据库迁移（14 个版本）
│   └── scripts/       # 题库导入
└── docs/              # 架构设计 + 实施计划
```
