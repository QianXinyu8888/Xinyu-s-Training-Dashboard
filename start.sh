#!/bin/bash
# ============================================================
# Xinyu's Training Dashboard 启动脚本
# ============================================================
# 使用方法：双击此文件，或在终端运行 ./start.sh
# ============================================================

cd "$(dirname "$0")"

echo "🏊‍♂️🚴🏃 启动 Xinyu's Training Dashboard..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "   请先运行: brew install node"
    read -p "按 Enter 退出..."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，安装依赖..."
    npm install
fi

# 检查 COROS 配置
if grep -q 'YOUR_PHONE_NUMBER' get_coros_data.js 2>/dev/null; then
    echo "⚠️  注意：COROS 账号仍为默认账号，请编辑 get_coros_data.js 修改"
fi

echo ""
echo "🌐 Dashboard 地址: http://localhost:3000"
echo "📱 iPhone 访问:    http://$(ipconfig getifaddr en0 2>/dev/null || echo '请查看局域网IP'):3000"
echo ""

# 启动服务
node server.js

read -p "按 Enter 退出..."
