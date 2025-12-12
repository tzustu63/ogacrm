#!/bin/bash

# 生產環境部署腳本
# 用於在 Lightsail 或其他 Linux 伺服器上部署

set -e

echo "🚀 開始部署招生CRM系統（生產環境）..."

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ 錯誤: Docker 未安裝"
    echo "請先安裝 Docker:"
    echo "  sudo apt update"
    echo "  sudo apt install -y docker.io docker-compose"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 錯誤: Docker Compose 未安裝"
    exit 1
fi

# 檢查 .env 文件
if [ ! -f .env ]; then
    echo "📝 創建 .env 文件..."
    
    # 生成隨機密鑰
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
    
    cat > .env << EOF
# 資料庫配置
DB_NAME=recruitment_crm
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}

# JWT 配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# 加密金鑰
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Node.js 環境
NODE_ENV=production
EOF
    
    echo "✅ .env 文件已創建（包含自動生成的密鑰）"
    echo "⚠️  請妥善保管 .env 文件中的密鑰！"
else
    echo "✅ .env 文件已存在"
fi

# 創建必要的目錄
echo "📁 創建必要的目錄..."
mkdir -p logs backups
chmod 755 logs backups

# 停止現有服務（如果存在）
echo "🛑 停止現有服務..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 啟用 Docker BuildKit（加快構建速度）
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 構建並啟動服務（使用緩存加速）
echo "🔨 正在構建 Docker 映像（使用緩存加速）..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 正在啟動服務..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查服務狀態
echo ""
echo "📊 服務狀態:"
docker-compose -f docker-compose.prod.yml ps

# 檢查健康狀態
echo ""
echo "🏥 檢查服務健康狀態..."
sleep 5

# 檢查後端健康
if docker-compose -f docker-compose.prod.yml exec -T backend wget --spider -q http://localhost:5000/health 2>/dev/null; then
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
echo "✅ 部署完成！"
echo ""
echo "📋 常用命令:"
echo "   查看日誌: docker-compose -f docker-compose.prod.yml logs -f"
echo "   查看狀態: docker-compose -f docker-compose.prod.yml ps"
echo "   停止服務: docker-compose -f docker-compose.prod.yml down"
echo "   重啟服務: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "📝 注意事項:"
echo "   1. 請確保防火牆已開放必要端口（如果需要直接訪問）"
echo "   2. 建議使用 Nginx 反向代理配置 HTTPS"
echo "   3. 定期備份資料庫: docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres recruitment_crm > backups/backup_\$(date +%Y%m%d_%H%M%S).sql"
echo ""





