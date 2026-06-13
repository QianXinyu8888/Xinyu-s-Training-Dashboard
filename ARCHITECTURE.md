# 架构设计文档

> 深入解析 Xinyu's Training Dashboard 的内部设计决策

---

## 系统架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (iPhone/Mac)                  │
│                                                          │
│  index.html (SPA)                                        │
│  ├── fetch /api/plans      ──────────────────────────────┐
│  ├── fetch /api/coros      ──────────────────────────────┼──► Express Server
│  ├── fetch /api/course     ──────────────────────────────┤    (Node.js)
│  └── read window._embedded_* (fallback)                   │    Port 3000
└──────────────────────────────────────────────────────────┘
         │                                    │
         │ GET /                             │ GET /api/*
         ▼                                    ▼
┌─────────────────┐              ┌────────────────────────┐
│  HTML Response  │              │  JSON API Response     │
│  (含内嵌数据)    │              │                        │
└─────────────────┘              └────────────────────────┘
         ▲                                    │
         │                                    ▼
┌─────────────────┐              ┌────────────────────────┐
│ index.html      │              │  get_coros_data_mcp.js │
│ 静态文件        │              │  (COROS MCP CLI)       │
└─────────────────┘              │  + ICS 解析            │
         ▲                       └────────────────────────┘
         │                                │
         │                                ▼
┌─────────────────┐              ┌────────────────────────┐
│ ~/Desktop/      │              │ COROS API              │
│ Xinyu's plans/  │              │ coros-mcp (OAuth)      │
│  (ICS 文件)      │              └────────────────────────┘
└─────────────────┘
```

---

## 数据流设计

### 1. 服务端数据内嵌策略（Critical Design）

这是本项目最重要的架构决策，解决跨设备访问时的网络可靠性问题。

**问题**：COROS API 是非官方接口，从 iPhone 浏览器直接请求会触发 CORS 限制。

**解决方案**：
```
用户请求 /
    │
    ▼
server.js 收到请求
    │
    ├─ 执行 get_coros_data_mcp.js --weekly   → 获取本周评分（MCP）
    ├─ 客户端异步 fetch /api/coros?mode=history  → 获取历史数据
    └─ 读取当日 course_YYYY-MM-DD.ics   → 获取课程数据
    │
    ▼
用真实数据替换 index.html 中的占位变量：
  let allHistory = [];        → let allHistory = [ {...}, ... ];
  let _embeddedWeekly_ = null; → let _embeddedWeekly_ = { summary: {...} };
  let _embeddedCourse_ = [];  → let _embeddedCourse_ = [ {...} ];
    │
    ▼
发送含完整数据的 HTML 给浏览器
    │
    ▼
浏览器收到页面，JS 立即执行
  ↓
window._embedded_* 已有初始数据 → 立即渲染
  ↓
同时发起 fetch /api/coros?mode=history
  ├─ 成功 → 用新数据覆盖内嵌数据（更新到最新）
  └─ 失败 → 保留内嵌数据，不清空（用户仍能看到数据）
```

**代码位置**：`server.js` 的 `app.get('/')` 处理器

### 2. 前端数据加载流程

```
页面加载
  │
  ├─ HTML 解析（此时 window._embedded_* 已有数据）
  │     ↓
  │   renderStats()     → 渲染四宫格（用内嵌数据，立即显示）
  │   renderToday()     → 渲染今日计划（用内嵌数据，立即显示）
  │   renderWeek()      → 渲染日历（用内嵌数据，立即显示）
  │   updateHeader()    → 更新时钟
  │
  └─ JS 执行 loadData()（异步）
        │
        ├─ fetch /api/plans    → 训练计划
        ├─ fetch /api/course   → 课程
        ├─ fetch /api/coros?mode=weekly  → 本周评分
        └─ fetch /api/coros?mode=history  → 历史记录
              │
              ├─ 全部成功 → 用最新数据重新渲染
              └─ 任意失败 → 保留内嵌数据，提示"同步失败"
```

### 3. 视图切换架构

Dashboard 有 3 个视图，通过 `style.display` 切换（**不是** React/Vue 的组件机制）：

```
┌─────────────────┐  showHistory()   ┌─────────────────┐
│   Main View     │ ──────────────►  │  History View   │
│ (style.display  │                  │                 │
│  = "block")     │ ◄────────────── │ (style.display  │
│                 │   backToPlan()  │  = "block")     │
└─────────────────┘                  └─────────────────┘
        │
        │ showDayDetail(key)
        ▼
┌─────────────────┐
│  Day Detail     │
│  View           │
│                 │
│  backToWeek() ──┘
└─────────────────┘
```

**注意**：所有视图都在同一个 `index.html` 中，通过 JS 操作 DOM 的 `style.display` 实现切换。这是最简单的单页应用模式，避免了路由管理的复杂性。

---

## 关键实现细节

### 1. ICS 日期年份自动修正

COROS 教练提供的 ICS 文件可能写的是 2025 年，但实际训练日在 2026 年。服务端和前端都有修正逻辑：

```javascript
// 前端 parseICS() 中：
text = text.replace(/DTSTART:2025(0[5-9]|1[0-2])/g, 'DTSTART:2026$1');
```

这条正则把 `DTSTART:20250501` ~ `DTSTART:20251231` 全部替换为 2026 年。

### 2. 运动类型判断算法

```javascript
function sportOf(s, d) {
  // 合并 summary 和 description，转换为小写
  const t = ((s || '') + (d || '')).toLowerCase();
  if (/swim|游泳/i.test(t)) return 'swim';
  if (/bike|骑行|cycle/i.test(t)) return 'bike';
  if (/run|跑步/i.test(t)) return 'run';
  if (/rest|休息|恢复/i.test(t)) return 'rest';
  return 'other';
}
```

优先级：游泳 > 骑行 > 跑步 > 休息 > 其他。依靠关键词匹配，不依赖 COROS 的 `sportType`。

### 3. COROS 数据获取（MCP）

通过 `npx coros-mcp call-tool` 调用官方 MCP 工具，OAuth 认证，无需手动管理 Header 和 Token。

```javascript
// get_coros_data_mcp.js 中
function mcpCall(tool, argsJson) {
  const cmd = `npx coros-mcp call-tool --tool ${tool} --arguments-json '${JSON.stringify(argsJson)}'`;
  const raw = execSync(cmd, { timeout: 30000 });
  // 解析返回的 JSON 文本
}
```

MCP 返回的是人类可读文本，`get_coros_data_mcp.js` 通过正则解析运动记录、体能评估、训练负荷等结构化数据。

### 4. 四宫格等高布局

使用 CSS Grid 的 `grid-auto-rows: 1fr` 实现四宫格等高：

```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 1fr;          /* 关键：强制所有行等高 */
  gap: 12px;
}
.stats-grid > * {
  height: 100%;                  /* 子元素填满单元格 */
  display: flex;
  flex-direction: column;
}
.stat-card {
  flex: 1;                       /* stat-card 内部也等高 */
}
```

---

## 性能考量

### 1. 服务端数据内嵌的代价

- 每次页面访问都会执行 1 次 MCP 调用（`--weekly`）
- `--history` 改为客户端异步 fetch，不阻塞首屏
- 约增加 1-3 秒 TTFB

### 2. 历史数据量

`--history` 拉取 6 个月数据，约 200-400 条记录。在移动网络下约 1-2 秒。

### 3. 前端渲染性能

纯 DOM 操作，无虚拟列表。在低端 iPhone 上渲染 400 条历史记录约 100-200ms，用户感知可接受。

---

## 安全性说明

1. **COROS 认证**：使用官方 MCP OAuth，token 由 MCP 管理，代码中无密码
2. **无数据库**：所有数据均在内存或用户设备本地，无持久化存储
3. **本地运行**：服务暴露在局域网，无公网访问控制，生产部署需加防火墙

---

*Architecture v2.0 — 2026-06-13（迁移至 COROS MCP）*
