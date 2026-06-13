# Xinyu's Training Dashboard 🏊‍♂️🚴🏃

> COROS 高驰手表数据 + 训练计划 ICS 日历 + 课程表，三合一个人训练追踪仪表盘

![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20iOS-lightgrey)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-Personal%20Project-blue)

---

## 📌 目录

1. [项目概述](#-项目概述)
2. [功能介绍](#-功能介绍)
3. [文件结构](#-文件结构)
4. [环境要求](#-环境要求)
5. [安装部署](#-安装部署)
6. [配置说明](#-配置说明)
7. [API 架构](#-api-架构)
8. [核心模块详解](#-核心模块详解)
9. [数据来源](#-数据来源)
10. [故障排查](#-故障排查)
11. [更新日志](#-更新日志)

---

## 🏖 项目概述

本项目为铁人三项运动员 **Xinyu**（21岁）开发，集成以下三类数据：

| 数据源 | 说明 | 格式 |
|--------|------|------|
| COROS 高驰手表 | 运动历史、训练评分、计划完成情况 | 官方 MCP CLI |
| 训练计划 ICS | 教练安排的每日训练内容 | iCalendar `.ics` 文件 |
| 课程表 ICS | 学期课程安排（跨 Agent 协作） | iCalendar `.ics` 文件 |

**技术栈**：Node.js + Express（后端）｜原生 HTML/CSS/JS（前端）｜无框架依赖

**部署方式**：本地运行，iPhone 通过 Tailscale 局域网访问

---

## 🎯 功能介绍

### 四宫格统计卡片

```
┌─────────────────┬─────────────────┐
│  本月训练时长    │  本月完成次数     │
│  16h 44min      │  18 次           │
│  共18次训练      │  ─────────────   │
│                 │  05/28 泳池游泳  │
│                 │  05/27 跑步机    │
├─────────────────┼─────────────────┤
│  本月运动占比    │  今日课程        │
│  🏊60% 🚴25% 🏃15%│  大学英语 - 1-2 │
│                 │  体育 - 3-4     │
└─────────────────┴─────────────────┘
```

- **本月训练时长**：当月所有运动总时长
- **本月完成次数** + **最近4条训练**：当月训练次数 + 最近运动列表（运动类型 + 日期 + 时长）
- **本月运动占比**：游泳/骑行/跑步三类运动时长占比，用 emoji 图标展示
- **今日课程**：当天课程表，来自 ICS 文件

### 今日计划

解析 ICS 文件 DESCRIPTION 字段，展示当日训练安排，支持时间段分组（早/中/晚），点击可展开详情。

### 本周计划日历

从当天起展示接下来7天（4+3 布局）的训练安排，彩色圆点标识已完成运动类型，hover 显示完成状态，点击日期格触发烟花特效并进入详情页。

### 训练历史

回顾所有 COROS 同步的运动记录，点击每条记录展开详情（距离、时长、平均心率、配速、训练负荷 TL）。

### 中英文双语

右上角 `EN ↔ ZH` 按钮一键切换，所有文案（包含统计数据标签）均支持国际化，偏好保存至 `localStorage`。

### 跨设备同步

服务启动时自动内嵌 COROS 历史数据到 HTML，抵抗弱网环境；iPhone 通过 Tailscale 访问，同一局域网内数据互通。

---

## 📁 文件结构

```
Xinyu's-Training-Dashboard/
├── README.md                          # 本文档
├── INSTALL.md                         # 安装指南
├── index.html                         # 前端主文件（含全部 HTML/CSS/JS）
├── server.js                          # Node.js Express 服务端
├── package.json                       # Node 依赖声明
├── get_coros_data_mcp.js             # COROS 数据获取脚本（官方 MCP CLI）
│
└── skills/
    └── coros-data-skill/              # COROS MCP 封装 Skill
        ├── SKILL.md
        └── scripts/

关联数据文件（项目外）：
├── ~/Desktop/Xinyu's plans/           # 训练计划 ICS 存放目录
│   ├── course_schedule/              # 课程表 ICS（由训练助手生成）
│   │   └── course_YYYY-MM-DD.ics
│   └── week{N}_{YYYYMMDD}.ics        # 每周训练计划
│
└── ~/.qclaw/skills/coros-data-skill/ # COROS MCP Skill
    └── scripts/
```

> **注意**：COROS 数据通过官方 `coros-mcp` CLI 获取，`get_coros_data_mcp.js` 封装 MCP 调用，供 `server.js` 内嵌使用。

---

## 🔧 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18 | 推荐使用 Homebrew `brew install node` |
| npm | 随 Node 附送 | 无需单独安装 |

**可选**：
- [Tailscale](https://tailscale.com/)：用于 iPhone 远程访问 Dashboard（需两台设备同时在线）
- COROS 账号：高驰手表配套 App 账号

---

## 🚀 安装部署

### Step 1：安装 Node.js

```bash
# macOS
brew install node

# 验证
node --version   # 应显示 v18+
npm --version
```

### Step 2：安装项目依赖

```bash
cd Xinyu's-Training-Dashboard
npm install
```

### Step 3：配置 COROS MCP

本项目使用 COROS 官方 `coros-mcp` CLI 获取数据（OAuth 认证，无需手动管理密码）。

```bash
# 安装 coros-mcp（首次）
npm install -g coros-mcp

# 首次使用需要登录授权
npx coros-mcp login
```

> COROS MCP 使用 OAuth 认证，登录一次后 token 持久化保存，无需每次输入密码。

### Step 4：准备训练计划 ICS 文件

将教练提供的 ICS 文件放入：
```bash
mkdir -p ~/Desktop/Xinyu\'s\ plans
# 将 .ics 文件放入此目录
```

**ICS 文件命名格式**：`week{N}_{YYYYMMDD}.ics`

**ICS 文件格式要求**：
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260529
SUMMARY:骑行 E区 90min
DESCRIPTION:户外骑行 90min Zone2
【训练内容】
E(90min): 轻松骑行保持心率在 E 区
END:VEVENT
END:VCALENDAR
```

- `DTSTART`：格式为 `YYYYMMDD`（无横杠）
- `SUMMARY`：训练标题
- `DESCRIPTION`：详细训练内容（支持多行，第二行以空格开头）

### Step 5：启动服务

```bash
cd Xinyu's-Training-Dashboard
node server.js
```

看到以下输出表示启动成功：
```
Dashboard running at http://localhost:3000
```

### Step 6：访问 Dashboard

| 设备 | 访问地址 |
|------|----------|
| 本机 Mac | http://localhost:3000 |
| 同一 WiFi 的 iPhone | http://`<Mac局域网IP>`:3000 |
| Tailscale 远程访问 | http://`<Tailscale IP>`:3000 |

**查询 Mac 局域网 IP**：
```bash
ipconfig getifaddr en0
# 输出例如：192.168.1.100
```

**启动脚本（ macOS 桌面快捷方式）**：
```bash
# 双击桌面上的 启动训练计划dashboard.sh 即可启动
# 或者终端运行：
~/Desktop/启动训练计划dashboard.sh
```

---

## ⚙ 配置说明

### 关键配置项

| 配置项 | 位置 | 说明 |
|--------|------|------|
| COROS 认证 | `coros-mcp` CLI | 运行 `npx coros-mcp login` 进行 OAuth 授权 |
| ICS 文件目录 | `server.js` 头部 | 通过 `.env` 的 `CAL_COURSE` / `CAL_PLAN` 配置 |
| 服务端口 | `server.js` | 默认 3000 |

### 修改 COROS 认证

如需重新登录或切换账号：
```bash
npx coros-mcp login
```

### 修改 ICS 目录

编辑 `server.js` 第 12-13 行：
```javascript
const PLANS_DIR = '/Users/你的用户名/Desktop/Xinyu\'s plans';
const COURSE_DIR = join(PLANS_DIR, 'course_schedule');
```

---

## 🌐 API 架构

### 后端路由（Express）

| 路由 | 方法 | 说明 | 返回内容 |
|------|------|------|----------|
| `/` | GET | 主页 | HTML（含内嵌 COROS 数据）|
| `/api/plans` | GET | 获取训练计划 | 当日及近期 ICS 事件列表 |
| `/api/coros` | GET | 获取 COROS 数据 | 运动记录/评分/训练计划 |
| `/api/course` | GET | 获取当日课程表 | 当日 ICS 课程事件 |

### COROS API 模式（`/api/coros?mode=xxx`）

| mode 参数 | 说明 | 对应 MCP 工具 |
|-----------|------|----------------|
| `weekly` | 本周汇总+体能评分 | `querySportRecords` + `queryFitnessAssessmentOverview` |
| `history` | 近6个月全部历史 | `querySportRecords`（180天范围）|

### `get_coros_data_mcp.js` CLI 用法

```bash
# 当日数据
node get_coros_data_mcp.js

# 指定日期
node get_coros_data_mcp.js 20260611

# 本周汇总
node get_coros_data_mcp.js --weekly

# 近6个月历史
node get_coros_data_mcp.js --history
```

---

## 📖 核心模块详解

### 1. server.js —— 服务端主入口

**职责**：
- 管理 Express 路由
- 解析 ICS 文件
- 调用 `get_coros_data_mcp.js` 获取 COROS 数据
- **关键**：在 HTML 响应前内嵌 COROS 数据（防止客户端 fetch 失败）

**数据内嵌策略**：
```javascript
// 访问 / 时，server.js 会：
// 1. 读取 index.html 源码
// 2. 执行 get_coros_data_mcp.js --weekly 获取本周 COROS 评分
// 3. 替换 HTML 中的占位变量：
//    let _embeddedWeekly_ = null;   → let _embeddedWeekly_ = <本周评分>;
//    let _embeddedCourse_ = [];     → let _embeddedCourse_ = <今日课程>;
// 4. 发送含数据的 HTML 给浏览器
```

这样即使浏览器无法访问 `/api/coros`（跨设备网络问题），页面依然有数据可展示。

### 2. index.html —— 前端单文件应用

**职责**：全部 UI 逻辑，不依赖任何外部库

**核心函数**：

| 函数名 | 功能 |
|--------|------|
| `loadData()` | 并行拉取 plans / course / weekly / history 数据 |
| `renderStats(d, historyActs)` | 渲染四宫格统计卡片 |
| `renderWeek(evts, todayKey, activities)` | 渲染本周日历（4+3 布局）|
| `renderToday(ev)` | 渲染今日计划列表 |
| `renderRecent(acts)` | 渲染近期训练记录列表 |
| `renderCourse(events)` | 渲染今日课程卡片 |
| `showHistory()` / `backToPlan()` | 切换到历史记录视图 |
| `showDayDetail(key)` | 点击日期格，显示详情（ICS 计划 + COROS 完成记录）|
| `updateHeader()` | 更新页面顶部时钟，每 10 秒刷新 |
| `toggleLang()` | 中英文切换，持久化到 localStorage |
| `firework(x, y)` | Canvas 粒子烟花特效 |

**全局变量**：

| 变量 | 类型 | 说明 |
|------|------|------|
| `allHistory` | Array | COROS 历史活动列表 |
| `allPlans` | Array | ICS 训练计划事件 |
| `allActivities` | Array | 当周 COROS 活动（用于日历叠加）|
| `_embeddedWeekly_` | Object | 服务端内嵌的本周 COROS 评分 |
| `_todayCourse` | Array | 当日课程 ICS 事件 |
| `locale` | String | 当前语言 `'zh'` 或 `'en'` |

### 3. get_coros_data_mcp.js —— COROS 数据获取

**调用方式**：通过 `npx coros-mcp call-tool` 调用官方 MCP 工具。

**使用的 MCP 工具**：

| 工具 | 参数 | 说明 |
|------|------|------|
| `querySportRecords` | startDate, endDate | 运动记录列表 |
| `queryFitnessAssessmentOverview` | — | VO2max、跑步等级、比赛预测 |
| `queryTrainingLoadAssessment` | days | 短期/长期训练负荷比 |

**运动类型 sportType 映射**：

| sportType | 运动类型 | 图标 |
|-----------|----------|------|
| 100-104 | 跑步类（户外/室内/越野/跑步机）| 🏃 |
| 200-204 | 骑行类（公路/室内/越野）| 🚴 |
| 300-301 | 游泳类（泳池/开放水域）| 🏊 |
| 10000 | 标铁/半铁 | 🔥 |

### 4. ICS 解析逻辑

**服务端解析（server.js）**：
- 使用正则按 `BEGIN:VEVENT` 切分块
- 按行解析 `DTSTART` / `SUMMARY` / `DESCRIPTION`
- `DESCRIPTION` 支持多行（第二行以空格开头）
- 自动修正年份：2025年文件（教练遗留）→ 2026年

**前端解析（index.html）**：
- 纯 JavaScript 实现
- 支持 `DTSTART:YYYYMMDD` 和 `DTSTART;VALUE=DATE:YYYYMMDD` 两种格式
- 自动 padStart 补零对齐日期格式
- 支持 `DESCRIPTION` 中 `\n` 和 `\\n` 两种换行符

---

## 📦 数据来源

### COROS MCP

- **工具**：官方 `coros-mcp` CLI（`npx coros-mcp call-tool`）
- **认证方式**：OAuth（`npx coros-mcp login`）
- **数据范围**：运动历史、体能评估、训练负荷
- **限制**：历史数据经 MCP 查询，无硬性条数限制

### ICS 训练计划

- **来源**：教练提供的训练计划（由训练助手 Agent 生成）
- **存放路径**：`~/Desktop/Xinyu's plans/week{N}_{YYYYMMDD}.ics`
- **更新方式**：手动放入新文件，重启服务

### 课程表 ICS

- **来源**：由训练助手 Agent（另一会话）生成
- **存放路径**：`~/Desktop/Xinyu's plans/course_schedule/course_YYYY-MM-DD.ics`
- **命名格式**：`course_2026-05-29.ics`

---

## 🔍 故障排查

### 页面空白或数据加载失败

**原因**：COROS MCP 请求失败

**排查**：
1. 检查 MCP 是否正常：`npx coros-mcp call-tool --tool queryFitnessAssessmentOverview --arguments-json '{}'`
2. 检查 MCP 登录状态：`npx coros-mcp login`
3. 重启服务：`node server.js`

### 四宫格显示"加载中"或"暂无数据"

**原因**：`renderStats` 函数崩溃（通常因为 ID 不匹配）

**排查**：
1. 打开浏览器 Console（F12 → Console）
2. 搜索 `[loadData] renderStats error` 日志
3. 常见错误：`Cannot set properties of null (setting 'innerHTML'` — 说明 JS 里的 `getElementById('xxx')` 在 HTML 中找不到对应元素

### 历史记录显示 0 条

**原因**：服务端数据内嵌成功，但客户端 `loadData()` 的 `fetch` 覆盖了内嵌数据（fetch 失败但 catch 里将 allHistory 置空）

**解决**：已在最新代码中修复，fetch 失败时保留内嵌数据，不覆盖。

### iPhone 无法访问 Dashboard

**排查步骤**：
1. 确认 Mac 和 iPhone 在同一 WiFi
2. 确认 Mac 防火墙允许 3000 端口
   ```bash
   # 检查防火墙
   sudo lsof -i :3000
   ```
3. 确认 Mac 局域网 IP：
   ```bash
   ipconfig getifaddr en0
   ```
4. 在 iPhone Safari 访问：`http://192.168.x.x:3000`
5. 若使用 Tailscale：确认两端都在线，访问 Tailscale IP

### COROS 登录失败

**解决**：
```bash
# 重新登录 MCP
npx coros-mcp login

# 验证 MCP 是否正常
npx coros-mcp call-tool --tool queryFitnessAssessmentOverview --arguments-json '{}'
```

### ICS 计划不显示

**排查**：
1. 确认文件放在正确目录：`~/Desktop/Xinyu's plans/`
2. 确认文件名以 `.ics` 结尾
3. 确认 `DTSTART` 日期格式为 `YYYYMMDD`（8位数字）
4. 查看服务端日志确认文件已读取：`node server.js` 的终端输出

---

## 📝 更新日志

### 2026-05-29 v1.0（当前版本）

- ✅ 四宫格统计卡片（含最近训练列表）
- ✅ 本周训练日历（4+3 布局，彩色运动类型圆点）
- ✅ 今日计划（ICS 解析 + 时间段分组）
- ✅ 训练历史记录（支持点击展开详情）
- ✅ 中英文双语切换
- ✅ 课程表集成
- ✅ 服务端数据内嵌策略（抗弱网）
- ✅ Canvas 烟花点击特效
- ✅ iPhone Tailscale 远程访问

---

## 👤 项目背景

| 项目 | 内容 |
|------|------|
| 运动员 | Xinyu，21岁 |
| 运动类型 | 铁人三项（游泳 + 骑行 + 跑步）|
| 最新比赛 | 2026-05-24 滴水湖标铁 3:02:14 |
| 当前训练计划 | S4557（2026-02-02 ~ 2026-06-07，共126天）|
| 手表 | COROS 高驰 |
| 开发者 | Xinyu's iOS VibeCoder Agent |

---

*最后更新：2026-05-29*
