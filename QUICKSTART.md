# 快速上手指南

> 5 分钟内让你的 Dashboard 运行起来

---

## 如果你已经有了完整项目文件

### 1. 安装依赖（一行命令）

```bash
cd Xinyu's-Training-Dashboard && npm install
```

### 2. 配置 COROS MCP

```bash
# 安装并登录 COROS 官方 MCP
npm install -g coros-mcp
npx coros-mcp login
```

### 3. 放入 ICS 训练计划文件

```bash
mkdir -p ~/Desktop/Xinyu\'s\ plans
# 把教练给的 .ics 文件复制进去
```

### 4. 启动

```bash
# 方式 A：双击桌面上的 启动训练计划dashboard.sh

# 方式 B：终端命令
cd Xinyu's-Training-Dashboard && node server.js
```

### 5. 打开浏览器

```
http://localhost:3000
```

---

## 如果你是从零开始（无任何文件）

你需要复制/下载以下 4 个文件到同一目录：

```
Xinyu's-Training-Dashboard/
├── index.html               ← 完整前端（含 HTML/CSS/JS）
├── server.js                ← Express 服务端
├── get_coros_data_mcp.js   ← COROS 数据获取脚本（MCP 封装）
└── package.json            ← Node.js 依赖声明
```

然后执行上述步骤即可。

---

## 首次验证清单

打开 http://localhost:3000 后，检查这些是否正常：

- [ ] 页面有内容，不是空白
- [ ] 顶部显示今天的日期和时间
- [ ] 四宫格有数字（不是"加载中"）
- [ ] 今日计划区域有内容或"今天休息"
- [ ] 点击右上角"⇄ 同步数据"按钮有反应

---

## 常见"第一次"问题

### Q：运行 `npm install` 报错网络错误

```bash
npm install --registry=https://registry.npmmirror.com
```

### Q：COROS 数据不显示

```bash
# 检查 MCP 是否正常工作
npx coros-mcp login
npx coros-mcp call-tool --tool queryFitnessAssessmentOverview --arguments-json '{}'
```

### Q：ICS 文件放入后页面没变化

- 确认文件扩展名是 `.ics`（不是 `.ics.txt`）
- 确认在 `~/Desktop/Xinyu's plans/` 目录下
- 重启服务（Ctrl+C 停止，再 `node server.js`）

### Q：iPhone 打不开页面

- 确认 iPhone 和 Mac 在同一个 WiFi
- Mac 上执行 `ipconfig getifaddr en0` 查局域网 IP
- iPhone 访问：`http://查到的IP:3000`
- 检查 Mac 防火墙设置

---

## 下一步

- 阅读 [README.md](README.md) 了解完整功能
- 阅读 [ARCHITECTURE.md](ARCHITECTURE.md) 了解内部设计
- 阅读 [INSTALL.md](INSTALL.md) 了解详细安装步骤
