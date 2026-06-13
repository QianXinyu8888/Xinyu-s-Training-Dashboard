# 安装指南 — Xinyu's Training Dashboard

> 完整的一步步安装流程，适用于从零开始搭建本项目

---

## 环境检测

在开始之前，先检查你的环境：

```bash
# 检查 Node.js
node --version
# 期望输出：v18.x.x 或更高

# 检查 npm
npm --version
# 期望输出：9.x.x 或更高

# 检查 git（可选）
git --version
```

---

## Step 1：安装 Node.js

### macOS

**方式 A：Homebrew（推荐）**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

**方式 B：官网下载**
- 访问 https://nodejs.org/zh-cn/download/
- 下载 macOS Installer (.pkg)
- 运行安装向导

### Windows

- 访问 https://nodejs.org/zh-cn/download/
- 下载 Windows Installer (.msi)
- 运行安装向导

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Step 2：获取项目文件

如果你是从 GitHub 克隆项目：

```bash
git clone <仓库地址>
cd Xinyu's-Training-Dashboard
```

如果是手动复制文件，确保包含以下文件：
- `index.html`
- `server.js`
- `get_coros_data_mcp.js`
- `package.json`

---

## Step 3：安装依赖

```bash
cd Xinyu's-Training-Dashboard
npm install
```

预期输出：
```
added 120 packages, and audited 120 packages in 5s
```

---

## Step 4：配置 COROS MCP

本项目使用 COROS 官方 `coros-mcp` CLI（OAuth 认证），无需手动管理密码。

```bash
# 安装 coros-mcp
npm install -g coros-mcp

# 首次登录授权
npx coros-mcp login
```

> 登录一次后 token 持久化保存，后续无需重复操作。

---

## Step 5：准备 ICS 训练计划文件

### 5.1 创建目录

```bash
mkdir -p ~/Desktop/Xinyu\'s\ plans/course_schedule
```

### 5.2 创建示例 ICS 文件

创建 `~/Desktop/Xinyu's plans/week1_20260601.ics`：

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Training Plan//Duoduo//CN
BEGIN:VEVENT
DTSTART:20260601
SUMMARY:骑行 E区 90min
DESCRIPTION:户外骑行 90min Zone2\n【训练内容】\n E(90min): 轻松骑行保持心率在 E 区\n 目标：平均心率 130-145bpm
END:VEVENT
BEGIN:VEVENT
DTSTART:20260602
SUMMARY:游泳 技术训练 60min
DESCRIPTION:泳池游泳 60min\n【训练内容】\n 技术训练 60min\n - 热身 10min 轻松游\n -  drills 4x100m\n -  主训练 30min 保持技术
END:VEVENT
BEGIN:VEVENT
DTSTART:20260603
SUMMARY:跑步 阈值跑 60min
DESCRIPTION:跑步机 60min\n【训练内容】\n T(60min): 阈值跑训练\n - 热身 15min E 区\n -  T区 4x10min（每组休息 3min）\n -  放松 10min
END:VEVENT
END:VCALENDAR
```

### 5.3 ICS 文件格式说明

| 字段 | 格式 | 示例 |
|------|------|------|
| `DTSTART` | `YYYYMMDD`（8位无横杠）| `DTSTART:20260601` |
| `SUMMARY` | 训练标题 | `SUMMARY:骑行 E区 90min` |
| `DESCRIPTION` | 详细描述，支持多行（第二行以空格开头）| `DESCRIPTION:...` |

---

## Step 6：启动服务

### 6.1 基本启动

```bash
cd Xinyu's-Training-Dashboard
node server.js
```

预期输出：
```
Dashboard running at http://localhost:3000
```

### 6.2 后台运行（生产环境）

```bash
# 使用 nohup 后台运行
nohup node server.js > /tmp/dashboard.log 2>&1 &
echo $!  # 记住 PID，方便之后停止

# 停止服务
kill <PID>
```

### 6.3 使用 pm2 管理（推荐生产环境）

```bash
# 安装 pm2
npm install -g pm2

# 启动
pm2 start server.js --name dashboard

# 查看状态
pm2 status dashboard

# 查看日志
pm2 logs dashboard

# 停止
pm2 stop dashboard
```

---

## Step 7：验证安装

在浏览器打开 **http://localhost:3000**，检查：

- [ ] 页面正常加载（不是空白页）
- [ ] 四宫格卡片显示数据（不全是"加载中"）
- [ ] 今日计划区域有内容
- [ ] 本周日历显示7天
- [ ] 点击"⇄ 同步数据"按钮能刷新 COROS 数据

---

## Step 8：iPhone 远程访问（Tailscale）

### 8.1 安装 Tailscale

在 Mac 和 iPhone 上分别安装 Tailscale：
- Mac：https://pkgs.tailscale.com/stable/#macos
- iPhone：App Store 搜索"Tailscale"

### 8.2 登录并组网

1. 两台设备都用同一个账户登录 Tailscale
2. 确认两台设备都显示"Connected"

### 8.3 获取 Tailscale IP

在 Mac 终端执行：
```bash
tailscale ip -4
# 输出例如：100.91.107.117
```

### 8.4 iPhone 访问

在 iPhone Safari 打开：
```
http://100.91.107.117:3000
```

> ⚠️ 两台设备必须**同时在线**才能互通

---

## 常见问题

### Q：端口 3000 被占用

```bash
# 查找占用进程
lsof -i :3000

# 换端口：编辑 server.js 第 11 行
const PORT = 3000;  // 改成例如 8080

# 重启后用新端口访问
```

### Q：npm install 报错网络问题

```bash
# 使用淘宝镜像
npm install --registry=https://registry.npmmirror.com

# 或设置全局镜像
npm config set registry https://registry.npmmirror.com
```

### Q：COROS 数据获取失败

- MCP 登录状态过期
- 解决方案：运行 `npx coros-mcp login` 重新授权

### Q：页面显示中文但想用英文

点击右上角 **EN ↔ ZH** 按钮，切换为英文界面。

---

*安装完成！如有问题请参考 README.md 的故障排查章节。*
