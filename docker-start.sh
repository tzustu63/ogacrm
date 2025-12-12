#!/bin/bash

# 招生CRM系統 Docker 啟動腳本

set -e

echo "🚀 正在啟動招生CRM系統..."

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 錯誤: Docker 未運行，請先啟動 Docker Desktop"
    exit 1
fi

# 檢查是否存在 .env 文件，如果不存在則創建範例
if [ ! -f .env ]; then
    echo "📝 創建 .env 文件..."
    cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
EOF
    echo "✅ .env 文件已創建（包含隨機 JWT_SECRET）"
fi

# 構建並啟動服務
echo "🔨 正在構建 Docker 映像..."
docker-compose build

echo "🚀 正在啟動服務..."
docker-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查服務狀態
echo ""
echo "📊 服務狀態:"
docker-compose ps

echo ""
echo "✅ 服務已啟動！"
echo ""
echo "📍 訪問地址:"
echo "   前端: http://localhost:3000"
echo "   後端 API: http://localhost:5000"
echo "   健康檢查: http://localhost:5000/health"
echo ""
echo "📋 常用命令:"
echo "   查看日誌: docker-compose logs -f"
echo "   停止服務: docker-compose down"
echo "   查看狀態: docker-compose ps"
echo ""
echo "或使用 Makefile:"
echo "   make logs        # 查看日誌"
echo "   make down        # 停止服務"
echo "   make ps          # 查看狀態"




