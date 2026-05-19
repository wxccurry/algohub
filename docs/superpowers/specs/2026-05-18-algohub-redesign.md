# AlgoHub 2.0 — 顶级刷题平台架构设计（终版）

> 2026-05-18 初版 · 2026-05-19 经 ChatGPT + Gemini 企业级评审整改
> 对标 LeetCode 架构 · 面向中国开发者 · 阶段式演进路线

---

## 一、总体目标

打造国内一流的算法刷题平台，核心体验对标 LeetCode：

- **题库为主**：多平台精选经典题，240 题起步，8 大算法分类，每类 30 题
- **差异化亮点**：逐题可视化学习 + AI Learning Copilot + 渐进式提示
- **轻量竞赛**：ACM 赛制周赛，排名 + 罚时
- **操作舒适度**：业内顶级前端交互体系

### 核心价值观（评审后新增）

> 企业级成功关键不只是技术先进，更在于稳定性、成本控制与持续演进能力。
> 第一阶段不追求超大型架构，核心资源优先投放到刷题体验与学习闭环。

---

## 二、整体架构（阶段式演进）

```
┌─────────────────────────────────────────────────────────┐
│                   Nginx / CDN                            │
├─────────────────────────────────────────────────────────┤
│  Next.js 16 (端口 3000) · SSR + ISR                      │
│  题库 | 竞赛 | 讨论 | 可视化 | 用户 | 管理              │
│  Monaco Editor | Canvas 引擎 | AI Learning Copilot      │
├─────────────────────────────────────────────────────────┤
│  FastAPI (端口 8000) · Modular Monolith                  │
│  modules/auth modules/problem modules/submission ...     │
├─────────────────────────────────────────────────────────┤
│  Judge Gateway (Go, 端口 9000) · gRPC + HTTP             │
│  gVisor 分级沙箱 · Risk Scoring · Redis Streams         │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 15 | Redis 7 | MinIO (对象存储)             │
├─────────────────────────────────────────────────────────┤
│  OpenTelemetry | Sentry | Grafana | Prometheus          │
└─────────────────────────────────────────────────────────┘

演进路径:
  Phase 1-3: Modular Monolith (FastAPI)
  Phase 4+:   Judge 服务 → 独立 Go 进程（评测瓶颈时拆分）
  Phase 5+:   按需拆分微服务（社区/竞赛独立服务）
```

---

## 三、前端设计

### 3.1 刷题页布局

```
┌──────────────────────────────────────────────────┐
│ Header: Logo │ 题库 │ 竞赛 │ 讨论 │ 可视化 │ 👤 │
├──────────────────────────────────────────────────┤
│ ┌───────────────┬────────────────────────┐      │
│ │ 左侧面板(可拖)│   右侧面板              │      │
│ │ [描述][题解]  │ ┌──────────────────┐   │      │
│ │ [提交][可视化]│ │ 语言 │ 字号 │ 全屏│   │      │
│ │              │ ├──────────────────┤   │      │
│ │ 题目描述     │ │ Monaco 代码编辑器 │   │      │
│ │ 示例        │ │                  │   │      │
│ │ 限制条件    │ ├──────────────────┤   │      │
│ │ 标签        │ │ 测试用例 │ 结果   │   │      │
│ │             │ │ [运行测试] [提交] │   │      │
│ └───────────────┴────────────────────────┘      │
│                  🤖 AI Copilot (右下角, 低侵入) │
└──────────────────────────────────────────────────┘
```

### 3.2 前端技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 16 + React 19 + TypeScript |
| 样式 | TailwindCSS v4 + shadcn/ui (Base-Nova) |
| 状态管理 | Zustand v5 |
| 编辑器 | Monaco Editor (动态导入) |
| 可视化 | Canvas API + 预计算帧（仅官方题解） |
| 动画 | framer-motion |
| 面板拖拽 | react-resizable-panels |
| 虚拟滚动 | @tanstack/react-virtual |
| 快捷键 | 自定义 useHotkeys hook |
| 主题 | next-themes (深色/浅色) |
| 错误监控 | Sentry (前端) |

### 3.3 交互体系

#### Hover 三级梯度
| 等级 | 触发 | 适用 |
|------|------|------|
| L1 被动 | 150ms ease-out | 题目行、标签、导航 |
| L2 可交互 | 120ms ease-out | 按钮、卡片、Tab |
| L3 富交互 | 100ms ease-out | 拖拽手柄、分隔线 |

全局规则：`transition-delay: 0s`（防止鼠标划过残影）

#### 点击反馈 + 防误触
- 一般按钮：mousedown scale(0.97) → mouseup scale(1.0)
- 高代价操作（提交、删除）：长按 ≥180ms 确认，SVG 进度环跑满
- 危险操作（删除）：二次点击确认

#### 动画令牌
| 令牌 | 值 | 用途 |
|------|-----|------|
| `--duration-instant` | 50ms | hover 颜色 |
| `--duration-fast` | 100ms | button press |
| `--duration-normal` | 200ms | tab switch, panel |
| `--duration-slow` | 300ms | modal, drawer（上限） |

必须支持 `prefers-reduced-motion: reduce`

#### 评测结果：四阶段叙事
1. 提交瞬间 → 按钮 Loading + 右下角滑入卡片
2. 开始评测 → SSE 推送 + 卡片升级 + 进度条
3. 结果揭晓 → AC 绿色脉冲 / WA 红色 + AI 提示
4. 结束状态 → 卡片可收起/展开（低侵入）

### 3.4 AI Learning Copilot 状态机

```
静默观察 → (首次WA) → 轻提示（小气泡，不打断）→ (用户点击) → 引导对话
                 ↓ (用户忽略)               ↓
             回到静默                 分步引导 (苏格拉底式)
                 ↓ (再次WA)
             提示渐强 → (3次WA+) → 自动展开对话
AC → 庆贺动画 (0.5s 绿光) → 回到静默
```

**关键变更（评审后）：AI 提示改为低侵入式，不自动弹窗打断用户。**

---

## 四、后端架构：Modular Monolith（评审后整改）

**原方案：DDD + Clean Architecture + Lagom DI + Result[T,E]**
**终版：Modular Monolith + FastAPI 原生 DI + 统一异常处理**

### 4.1 目录结构

```
backend/
├── app/
│   ├── main.py                  # 应用工厂 + router 注册
│   ├── config.py                # pydantic-settings
│   ├── exceptions.py            # 统一异常类 + 全局 handler
│   │
│   ├── middleware/               # 中间件
│   │   ├── cors.py
│   │   ├── rate_limit.py
│   │   ├── request_id.py        # X-Trace-ID 注入
│   │   ├── access_log.py        # 结构化日志
│   │   └── error_handler.py     # 异常 → 统一响应
│   │
│   ├── dependencies/             # FastAPI Depends
│   │   ├── auth.py              # get_current_user, require_role
│   │   ├── pagination.py        # 分页参数
│   │   └── db.py                # get_db session
│   │
│   ├── modules/                  # 模块化业务（每个模块自包含）
│   │   ├── auth/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   ├── problem/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   ├── submission/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   ├── contest/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   ├── post/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── models.py
│   │   ├── ai/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── prompts/         # Prompt 版本管理
│   │   │   │   ├── hint_v1.py
│   │   │   │   ├── analyze_v1.py
│   │   │   │   └── chat_v1.py
│   │   │   └── schemas.py
│   │   └── user/
│   │       ├── router.py
│   │       ├── service.py
│   │       ├── schemas.py
│   │       └── models.py
│   │
│   ├── shared/                   # 共享工具
│   │   ├── database.py           # SQLAlchemy engine + session
│   │   ├── cache.py              # Redis 客户端
│   │   ├── security.py           # JWT + bcrypt
│   │   └── response.py           # 统一响应 helpers
│   │
│   └── judge/                    # 评测客户端（Go 服务对接）
│       ├── client.py             # HTTP/gRPC 调用 Go Judge
│       └── callback.py           # 评测结果回调处理
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── alembic/
├── scripts/
│   └── import_problems.py
└── requirements.txt
```

### 4.2 关键技术选型（评审后调整）

| 项目 | 原方案 | 终版 | 理由 |
|------|--------|------|------|
| 架构 | DDD + Clean Architecture | Modular Monolith | 冷启动阶段复杂度低 |
| DI | Lagom 容器 | FastAPI 原生 Depends | 减少引入外部依赖 |
| 错误处理 | Result[T,E] | 统一异常 + middleware | 团队学习成本低 |
| 日志 | structlog | structlog | 保持不变 |
| 指标 | Prometheus | Prometheus + OpenTelemetry | 增加链路追踪 |
| 链路 | 无 | OpenTelemetry | 评审新增 |
| 错误监控 | 无 | Sentry | 评审新增 |

### 4.3 统一异常处理

```python
# app/exceptions.py
class AppError(Exception):
    def __init__(self, code: int, message: str, detail: dict = None):
        self.code = code
        self.message = message
        self.detail = detail

class NotFoundError(AppError):
    def __init__(self, resource: str, id: int):
        super().__init__(404, f"{resource} not found", {"id": id})

class ForbiddenError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(403, message)

class ValidationError(AppError):
    def __init__(self, errors: list):
        super().__init__(422, "Validation failed", {"errors": errors})

# middleware/error_handler.py 注册到 app
@app.exception_handler(AppError)
async def app_error_handler(request, exc: AppError):
    return JSONResponse(status_code=exc.code, content={
        "code": exc.code,
        "message": exc.message,
        "data": None,
        "errors": exc.detail.get("errors") if exc.detail else None,
        "trace_id": request.state.trace_id,
    })
```

### 4.4 统一响应格式

```json
{
  "code": 200,
  "message": "ok",
  "data": {},
  "trace_id": "uuid",
  "timestamp": 1700000000
}
```

### 4.5 缓存策略

```
L1 内存 LRU (1000条, 5min TTL)
L2 Redis (题目/用户排名/排行榜)
L3 PostgreSQL (持久化)

Key 规范: algohub:{module}:{resource}:{id}:{variant}

排行榜落盘: Redis Sorted Set 每 5 分钟异步写回 PostgreSQL
```

---

## 五、评测引擎（评审后强化）

### 5.1 架构（阶段式）

```
Phase 1 (当前): Celery + Docker 容器 + Redis Queue
Phase 2 (日活>1000): Go Judge Gateway + Redis Streams + Pre-warmed Pool
Phase 3 (日活>10000): Go Judge + gVisor + NATS/Kafka + K8s HPA

Phase 2 目标架构:
┌──────────────────────────────────────────────────┐
│  Judge Gateway (Go, :9000)                        │
│  gRPC + HTTP API                                  │
│                                                   │
│  Redis Streams:                                   │
│    judge:stream:high (竞赛)                       │
│    judge:stream:normal (普通)                     │
│    judge:stream:batch (重评)                      │
│                                                   │
│  Consumer Groups (Go Workers × 8)                 │
│    ├─ Pre-warmed Pool (Python/Java 热容器)        │
│    └─ Cold-start Pool (按需创建)                  │
│                                                   │
│  SSE Gateway → 前端（替代轮询）                   │
│    Go Worker → Redis Pub/Sub → SSE Gateway        │
└──────────────────────────────────────────────────┘
```

### 5.2 安全层级（分级启用，非全量）

| 层级 | 技术 | 何时启用 | 防护目标 |
|------|------|----------|----------|
| L1 | cgroup v2 | 默认启用 | CPU/内存/PID 硬限制 |
| L2 | seccomp-bpf 白名单 | 默认启用 | 系统调用过滤 |
| L3 | 网络命名空间 | 默认启用 | 完全断网 |
| L4 | Docker 标准隔离 | 默认启用 | 基础容器隔离 |
| L5 | AST 风险评分 | 默认启用 | 评分不阻断，高危告警 |
| L6 | gVisor (runsc) | 竞赛/高风险用户 | 用户态内核（性能开销 10-15%）|

### 5.3 AST 风险评分（替代强阻断）

```python
# 不直接拒绝提交，而是打分 + 告警
RiskScoring:
  LOW (0-2):    发现 import os 等可疑但无害的导入 → 放行
  MEDIUM (3-5): 发现 subprocess / socket 导入 → 放行 + 告警日志
  HIGH (6-8):   发现 fork + exec 组合 / ctypes调用 → 放行 + 安全团队通知
  CRITICAL (9-10): 发现明确的恶意模式 → 拒绝 + 封禁IP审查

# 默认不拒绝, 仅 CRITICAL 级别拒绝
# 所有 HIGH+ 记录到安全审计日志
```

### 5.4 资源硬限制

- CPU: 1 核 (可每题配置)
- 内存: 256MB (16-1024MB 可配)
- 进程数: 32
- 临时文件: 64MB
- 输出: 1MB 上限
- 网络: 完全禁止

### 5.5 输出比对

- 精确匹配 + 浮点误差容忍 + 无序集合匹配

### 5.6 Pre-warmed Worker Pool

```
Python 热容器池: 2-4 个预启动容器，保持运行
C++/Java 编译缓存: 编译器 + 标准库预加载
空闲回收: 30s 无任务则回收
```

---

## 六、数据库设计（评审后优化）

### 6.1 核心表

`users`, `user_profiles`, `problems`, `problem_tags`, `submissions`, `posts`, `comments`, `user_stars`, `contests`

### 6.2 新增表

| 表 | 说明 |
|------|------|
| `problem_hints` | 渐进提示 (每题 3 条, 排序) |
| `company_tags` | 公司标签 |
| `similar_problems` | 相似题目关联 |
| `problem_votes` | 题目赞/踩 |
| `user_problem_status` | 题目状态缓存 (初期表结构, 大用户量后 Bitmap) |
| `submission_runtime_stats` | 运行时间分布 (击败百分比) |
| `problem_lists` | 用户自定义合集 |
| `user_favorites` | 题目收藏 |
| `user_checkins` | 每日打卡 |
| `visualization_frames_meta` | 可视化帧元数据 (帧数据存 MinIO) |
| `contest_participants` | 竞赛参与 |
| `contest_problems` | 竞赛题目关联 |
| `audit_logs` | 管理员审计日志（评审新增） |
| `ai_usage_logs` | AI Token 消耗记录（评审新增） |

### 6.3 数据库优化（评审后调整）

| 优化项 | 方案 |
|--------|------|
| submissions 分区 | 按月 RANGE partition，保留 12 个月热数据，历史归档 |
| visualization_frames | 帧 JSONB 迁移到 MinIO/S3 对象存储，DB 只存元数据 |
| user_problem_status | 初期普通表，DAU > 10000 后升级 Bitmap 存储 |
| 竞赛排名 | Redis Sorted Set，整数复合 Score（score*10^9 + penalty），每秒不一定时落盘到 PostgreSQL |
| 全文搜索 | pg_trgm GIN 索引 |
| 题目列表 | 覆盖索引 (is_public + difficulty + id) |
| 物化视图 | problem_stats 每 5 分钟 REFRESH |
| 排行榜恢复 | Redis 每 5 分钟异步 SADD → PostgreSQL ranking_snapshots 表 |

---

## 七、AI Learning Copilot（评审后强化）

### 7.1 模型策略

- 主力：DeepSeek V3 (deepseek-chat)
- 备用：通义千问 (qwen-max)
- 本地：Qwen2.5（敏感题目可选本地推理）

### 7.2 功能

| 端点 | 说明 |
|------|------|
| `POST /api/v1/ai/chat` | SSE 流式对话 |
| `POST /api/v1/ai/hint` | 四级渐进提示 |
| `POST /api/v1/ai/analyze` | 错误原因分析 |
| `POST /api/v1/ai/recommend` | 相似题推荐 |

### 7.3 上下文裁剪策略（评审新增）

```python
# 严格控制每次 API 调用的 token 消耗
AIRequestContext:
  problem_summary: str       # 题目摘要（≤500 chars，不是完整描述）
  current_code: str          # 用户最新代码（截断 ≤2000 chars）
  failed_testcase: dict      # 仅失败的测试用例
  conversation: list[dict]   # 最近 2 轮对话（不是全部历史）
  user_level: str            # beginner/intermediate/advanced

# 不传入: 完整题目描述、全部测试用例、全文对话历史、用户完整 profile
```

### 7.4 Prompt 版本管理（评审新增）

```
ai/prompts/
├── hint_v1.py        # 当前版本
├── hint_v1_backup.py # 上一版本（可回滚）
├── analyze_v1.py
└── chat_v1.py

# 每次修改 Prompt 后:
# 1. 在 1% 流量上 A/B 测试 24h
# 2. 对比 "用户采纳率" 和 "对话轮次"
# 3. 指标提升 → 全量；下降 → 回滚
```

### 7.5 Error Signature 缓存（评审新增）

```python
# 相同错误不重复调 AI
error_signature = SHA256(
    problem_id + verdict + failed_testcase_hash + code_snippet_hash
)[:16]

# Redis: algohub:ai:error_cache:{signature} → 分析结果
# TTL: 7 天
# 命中率预估: 同题同错 60%+
```

### 7.6 成本控制

| 层级 | 限制 |
|------|------|
| 免费用户 | 20 次/天, 1024 token/次 |
| 会员用户 | 200 次/天, 2048 token/次 |
| Token 监控 | Prometheus 指标 + Grafana Dashboard |
| 告警 | 日均 Token 超预算 80% → 通知管理员 |
| 降级 | AI 不可用时自动回退到静态 hint（DB 中的 problem_hints）|

---

## 八、可视化引擎（评审后边界明确）

### 8.1 范围界定

```
Phase 1: 仅官方题解静态可视化
  - 后台预计算帧 → JSONB 存 MinIO → 前端 Canvas 渲染
  - 用户可选预设输入数据观看

Phase 2（独立版本）: 动态运行时可视化
  - 用户提交代码 → 执行时 Trace → 生成可视化帧
  - 属于独立产品能力，不耦合在刷题流程中
```

### 8.2 核心结构优先支持

数组 · 链表 · 树 · 图搜索 · 动态规划表 · 栈/队列 · 排序 · 双指针 · 回溯

### 8.3 存储

```
visualization_frames_meta (PostgreSQL):
  id, problem_id, algorithm_type, total_steps, default_input (JSON),
  frames_path (MinIO key), created_at

MinIO:
  algohub-visualization/{problem_id}/{algorithm_type}/{input_hash}.json
```

---

## 九、可观测性体系（评审新增）

### 9.1 监控栈

```
OpenTelemetry SDK (Python/Go/JS)
  ├─ Traces → Jaeger / Grafana Tempo
  ├─ Metrics → Prometheus → Grafana
  └─ Logs → structlog → Loki

Sentry (前后端 + Go Judge panic 捕获)

Grafana Dashboard:
  - 实时 QPS + P95 延迟
  - Judge 队列深度 + Worker 利用率
  - AI Token 消耗 + Error Signature 命中率
  - 各语言/状态提交分布
  - 沙箱 OOM/异常重启次数
```

### 9.2 审计日志（管理员操作）

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,                -- 操作者
    action VARCHAR(100),            -- problem.create / testcase.edit / data.export
    resource_type VARCHAR(50),      -- problem / contest / user
    resource_id INTEGER,
    detail JSONB,                   -- 变更内容
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 十、安全与反作弊体系（评审新增）

### 10.1 代码相似度检测

```
竞赛/高频提交场景:
  AST Similarity:  提交时实时计算 AST 结构相似度（快速，低开销）
  MOSS/JPlag:      赛后批量检测（全量，高精度）
  
  相似度 > 80% 且来自不同用户 → 标记 suspicious → 人工审核
```

### 10.2 细粒度限流

| 维度 | 限制 | 实现 |
|------|------|------|
| IP | 60/分钟 | slowapi |
| User (普通) | 5 提交/分钟 | slowapi |
| User (竞赛) | 不限 | 白名单 |
| AI 调用 | 20-200/天 | Redis 计数器 |
| Judge 回调 | HMAC + 时间窗 60s | 防重放 |

### 10.3 Secrets 管理

```
开发阶段: .env (不提交 git)
生产阶段: HashiCorp Vault 或云厂商 Secret Manager
```

---

## 十一、题库建设

### 11.1 算法分类

```
数组 / 字符串 / 链表 / 栈与队列 / 哈希表 / 树 / 堆
贪心 / 动态规划 / 图论 / 二分搜索 / 位运算 / 数学 / 回溯 / 排序
```

### 11.2 分阶段题量

| 阶段 | 题量 | 内容 |
|------|------|------|
| Phase 1 (MVP) | 240 | 8 核心分类：Array / String / HashTable / Tree / LinkedList / DP / Greedy / Graph，每类 30 题 |
| Phase 2 | 560 | 扩展 7 类：Stack&Queue / Heap / BinarySearch / BitManipulation / Math / Backtracking / Sort，每类 40 题 + 补充 |
| Phase 3 | 760 | 竞赛真题 + 面试高频 + 公司标签完善 |

### 11.3 题目来源

LeetCode · 牛客网 · 洛谷 · Codeforces · AtCoder · CodeChef · 蓝桥杯 · USACO · POJ/HDU

---

## 十二、实施路线图（评审后调整）

| Phase | 内容 | 工期 | 评审调整 |
|-------|------|------|----------|
| 1. 架构基建 | Modular Monolith + DB 迁移 + 前端交互基础 | 3-4 天 | **简化架构** (DDD→ModMon)，移除 Lagom/Result[T,E] |
| 2. 刷题体验 | 题目详情页 + 题库列表 + SSE评测推送 + 快捷键 | 5-6 天 | **SSE 替代轮询** |
| 3. 题库建设 | 240 题 JSON + 导入 + 管理后台 | 3-4 天 | — |
| 4. AI Copilot | 后端 AI 服务（含裁剪/版本/Prompt管理） + 前端悬浮助手（低侵入） | 3-4 天 | **加 ErrorSignature缓存 + Prompt版本管理** |
| 5. 可视化 | Canvas 引擎 + 帧存 MinIO | 3-4 天 | **帧数据迁对象存储** |
| 6. 竞赛+打磨 | 轻量竞赛 + 交互走查 + 微动画 | 3-4 天 | — |
| 7. 可观测+安全 | OTel+Sentry+Grafana + 审计日志 + 限流 + Secrets | 2-3 天 | **新增整个 Phase** |
| 8. 测试+优化 | 单元/集成/负载测试 + Lighthouse + 分区表 | 2-3 天 | **加 submissions 分区** |

**总计：约 24-32 天**

### 关键原则

- Phase 1-3 只做 Modular Monolith，不做微服务拆分
- Go Judge 独立服务在 Phase 1 保持 Celery 方案，Phase 2+ 升级
- gVisor 默认不启用，仅竞赛或审查后手动开启
- AI 每次迭代必须有 A/B 测试验证 Prompt 变更效果
- 排行榜必须有 Redis → PostgreSQL 定期落盘机制

---

## 终版确认清单

| 维度 | 原方案 | 终版（评审后） |
|------|--------|---------------|
| 后端架构 | Clean Arch + DDD + Lagom | Modular Monolith + FastAPI Depends |
| 错误处理 | Result[T,E] | 统一异常 + middleware |
| 评测推送 | WebSocket | SSE（Go → Pub/Sub → SSE Gateway） |
| 安全沙箱 | gVisor 全量 | gVisor 分级，默认不启用 |
| AST 分析 | 强阻断 | 风险评分（CRITICAL 才阻断） |
| 消息队列 | Redis Queue | Redis Streams（Phase 2 升级） |
| Judge 优化 | 无 | Pre-warmed Pool |
| 可视化 | 帧存 DB JSONB | 帧存 MinIO，DB 只存元数据 |
| submissions | 无分区 | 按月分区 |
| AI 上下文 | 全量传入 | 严格裁剪（500+2000+2轮） |
| AI Prompt | 无版本 | 版本管理 + A/B 测试 |
| AI 缓存 | 简单去重 | Error Signature 缓存 |
| AI 弹窗 | 自动弹出 | 低侵入提醒 |
| 可观测性 | Prometheus | + OpenTelemetry + Sentry + Grafana |
| 审计日志 | 无 | audit_logs 表 |
| 代码查重 | 无 | AST Similarity + MOSS/JPlag |
| 限流 | 基础 | 细粒度（IP/User/Contest/AI/Judge）|
| Secrets | .env | Vault / Secret Manager |
| 排行榜 | Redis 不落盘 | 5 分钟定期落盘 |
