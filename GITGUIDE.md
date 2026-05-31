# GitHub 上传指南

> 将本项目上传到你的 GitHub 仓库

---

## 1. 在 GitHub 创建仓库

1. 登录 https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写：
   - **Repository name**：`duoduo-training-dashboard`
   - **Description**：`COROS 手表数据 + ICS 训练计划 Dashboard`
   - **Private**（推荐选私有，因为包含 COROS 账号配置）
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

# 本地配置（包含账号密码，禁止上传！）
.env
.env.local
.env.production

# 服务端嵌入数据（每次启动都会变化）
/data/

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

- COROS API 集成（活动历史/训练评分）
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

### 你的 COROS 账号配置

`get_coros_data.js` 中的账号密码**不应**提交到 GitHub。有两种处理方式：

**方式 A：使用 .gitignore（推荐）**

将 `get_coros_data.js` 改为模板文件：
```bash
cp get_coros_data.js get_coros_data.js.template
echo "get_coros_data.js" >> .gitignore
echo "get_coros_data.js.template" >> .gitignore
```

提交时用户会看到 `.template` 版本，复制一份并填入自己的账号。

**方式 B：使用环境变量**

在 `.gitignore` 中添加 `get_coros_data.js`，并在 `.gitignore` 中排除它：
```bash
echo "get_coros_data.js" >> .gitignore
git add .gitignore
git commit -m "chore: ignore get_coros_data.js (contains credentials)"
```

### 创建 .env 示例文件

创建 `.env.example`（不含真实密码）提交：
```bash
cat > .env.example << 'EOF'
# COROS 账号配置
COROS_ACCOUNT=你的手机号
COROS_PASSWORD=你的MD5密码（32位小写）
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

# 复制并填写配置
cp get_coros_data.js.template get_coros_data.js
# 编辑 get_coros_data.js，填入你的 COROS 账号

# 放入 ICS 文件
mkdir -p ~/Desktop/Xinyu\'s\ plans
# 放入 .ics 文件

# 启动
node server.js
```

---

## 8. 如果之前忘了忽略敏感文件

如果你已经把含密码的 `get_coros_data.js` 提交了，立即：

```bash
# 从 Git 历史中删除（不可逆！）
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch get_coros_data.js' \
  --tag-name-filter cat -- --all

# 重新提交
git add .
git commit -m "chore: remove credentials from history"
git push --force
```

> ⚠️ 这会改写 Git 历史，其他协作者需要重新克隆仓库。
