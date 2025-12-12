#!/bin/bash

# 快速部署腳本 - 用於後續更新部署
# 使用緩存加速構建，適合頻繁更新程式碼的場景

set -e

echo "⚡ 開始快速部署（使用緩存）..."

# 啟用 Docker BuildKit（加快構建速度）
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main || echo "⚠️  Git pull 失敗，繼續使用本地代碼..."

# 創建必要的目錄
mkdir -p logs backups
chmod 755 logs backups 2>/dev/null || true

# 構建並啟動服務（使用緩存，不強制重新構建）
echo "🔨 正在構建 Docker 映像（使用緩存加速）..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 正在啟動服務..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查服務狀態
echo ""
echo "📊 服務狀態:"
docker-compose -f docker-compose.prod.yml ps

# 檢查健康狀態
echo ""
echo "🏥 檢查服務健康狀態..."
sleep 3

# 檢查後端健康
if docker-compose -f docker-compose.prod.yml exec -T backend node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" 2>/dev/null; then
    echo "✅ 後端服務正常"
else
    echo "⚠️  後端服務可能還在啟動中，請稍後檢查"
fi

# 檢查前端健康
if docker-compose -f docker-compose.prod.yml exec -T frontend wget --spider -q http://localhost:80 2>/dev/null; then
    echo "✅ 前端服務正常"
else
    echo "⚠️  前端服務可能還在啟動中，請稍後檢查"
fi

echo ""
echo "✅ 快速部署完成！"
echo ""
echo "💡 提示:"
echo "   - 如果遇到問題，可以使用 ./deploy-prod.sh 進行完整重建"
echo "   - 查看日誌: docker-compose -f docker-compose.prod.yml logs -f"
echo ""

