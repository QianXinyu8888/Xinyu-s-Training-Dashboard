# GitHub 上传指南

> 将本项目上传到你的 GitHub 仓库

---

## 1. 在 GitHub 创建仓库

1. 登录 https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写：
   - **Repository name**：`duoduo-training-dashboard`
   - **Description**：`COROS 手表数据 + ICS 训练计划 Dashboard`
   - **Private**（推荐选私有）
   - **不要**勾选 "Add a README"（我们已有）
4. 点击 **Create repository**

---

## 2. 初始化 Git 并关联远程仓库

在项目目录执行（替换 `<你的GitHub用户名>`）：

```bash
cd ~/Desktop/Xinyu's-Training-Dashboard

# 初始化 Git（已有 .git 则跳过）
git init

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/<你的GitHub用户名>/duoduo-training-dashboard.git
```

---

## 3. 创建 .gitignore（敏感信息不提交）

```bash
cat > .gitignore << 'EOF'
# 依赖
node_modules/

# 日志
*.log
/tmp/

# macOS
.DS_Store

# 环境变量
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
EOF
```

---

## 4. 配置本地用户信息（仅限本项目）

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

---

## 5. 提交代码

```bash
# 添加所有文件（排除 .gitignore 中的）
git add .

# 提交
git commit -m "feat: initial Xinyu's Training Dashboard

- COROS MCP 集成（运动历史/体能评估）
- ICS 训练计划解析与展示
- 课程表集成
- 中英文双语
- Notion 风格 UI"

# 推送
git branch -M main
git push -u origin main
```

---

## ⚠️ 敏感信息处理

### COROS 认证

本项目使用 COROS 官方 `coros-mcp` CLI（OAuth 认证），**无需在代码中存储密码**。认证 token 存储在系统本地，不会进入 Git 仓库。

### 环境变量

如需通过 `.env` 配置日历名称等，创建 `.env.example`（不含真实值）提交：
```bash
cat > .env.example << 'EOF'
# Apple Calendar 名称
CAL_COURSE=你的课程表日历名
CAL_PLAN=你的训练计划日历名
EOF
```

---

## 6. 之后的更新

```bash
# 修改代码后
git add .
git commit -m "fix: 修复历史记录显示问题"
git push
```

---

## 7. 下载到新机器

在另一台机器上克隆后：

```bash
git clone https://github.com/<你的用户名>/duoduo-training-dashboard.git
cd duoduo-training-dashboard
npm install

# 安装并配置 COROS MCP
npm install -g coros-mcp
npx coros-mcp login

# 放入 ICS 文件
mkdir -p ~/Desktop/Xinyu\'s\ plans
# 放入 .ics 文件

# 启动
node server.js
```
