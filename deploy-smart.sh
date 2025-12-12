#!/bin/bash

# 智能部署腳本 - 只構建改變的服務
# 自動檢測代碼變更，只重新構建必要的服務

set -e

echo "🧠 開始智能部署..."

# 啟用 Docker BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main || echo "⚠️  Git pull 失敗，繼續使用本地代碼..."

# 檢查哪些文件改變了（與上一次部署比較）
LAST_DEPLOY_FILE=".last_deploy_commit"
CURRENT_COMMIT=$(git rev-parse HEAD)

if [ -f "$LAST_DEPLOY_FILE" ]; then
    LAST_COMMIT=$(cat "$LAST_DEPLOY_FILE")
    CHANGED_FILES=$(git diff --name-only "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || echo "")
else
    # 第一次部署，構建所有服務
    CHANGED_FILES="all"
fi

BUILD_BACKEND=false
BUILD_FRONTEND=false

# 檢查是否需要重新構建後端
if [ "$CHANGED_FILES" = "all" ] || echo "$CHANGED_FILES" | grep -qE "(src/|package\.json|tsconfig\.json|Dockerfile\.backend|scripts/|database/)"; then
    BUILD_BACKEND=true
    echo "📦 檢測到後端代碼變更，將重新構建後端"
fi

# 檢查是否需要重新構建前端
if [ "$CHANGED_FILES" = "all" ] || echo "$CHANGED_FILES" | grep -qE "(frontend/|Dockerfile\.frontend)"; then
    BUILD_FRONTEND=true
    echo "📦 檢測到前端代碼變更，將重新構建前端"
fi

# 如果沒有變更，只重啟服務
if [ "$BUILD_BACKEND" = false ] && [ "$BUILD_FRONTEND" = false ]; then
    echo "✅ 沒有檢測到代碼變更，只重啟服務..."
    docker-compose -f docker-compose.prod.yml up -d
else
    # 構建改變的服務
    if [ "$BUILD_BACKEND" = true ]; then
        echo "🔨 構建後端..."
        docker-compose -f docker-compose.prod.yml build backend
    fi
    
    if [ "$BUILD_FRONTEND" = true ]; then
        echo "🔨 構建前端..."
        docker-compose -f docker-compose.prod.yml build frontend
    fi
    
    # 啟動服務
    echo "🚀 啟動服務..."
    docker-compose -f docker-compose.prod.yml up -d
fi

# 記錄本次部署的 commit
echo "$CURRENT_COMMIT" > "$LAST_DEPLOY_FILE"

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查服務狀態
echo ""
echo "📊 服務狀態:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ 智能部署完成！"
echo ""

