# Docker 部署指南

## 前置需求

- Docker Desktop (或 Docker Engine + Docker Compose)
- 至少 2GB 可用磁碟空間

## 快速開始

### 1. 設置環境變數（可選）

如果需要自定義配置，可以創建 `.env` 文件：

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 2. 啟動所有服務

```bash
# 構建並啟動所有容器
docker-compose up -d --build

# 查看日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 3. 訪問應用

- **前端**: http://localhost:8888
- **後端 API**: http://localhost:5001
- **健康檢查**: http://localhost:5001/health
- **資料庫端口**: 5434 (映射到容器內的 5432)

### 4. 初始化資料庫

容器啟動後，後端會自動運行資料庫遷移。如果需要手動初始化：

```bash
# 進入後端容器
docker-compose exec backend sh

# 運行遷移（如果需要的話）
# 遷移會在容器啟動時自動運行
```

## 常用命令

### 啟動服務
```bash
docker-compose up -d
```

### 停止服務
```bash
docker-compose down
```

### 停止並刪除資料
```bash
docker-compose down -v
```

### 重啟特定服務
```bash
docker-compose restart backend
docker-compose restart frontend
```

### 查看服務狀態
```bash
docker-compose ps
```

### 進入容器
```bash
# 進入後端容器
docker-compose exec backend sh

# 進入資料庫容器
docker-compose exec db psql -U postgres -d recruitment_crm
```

### 查看資源使用
```bash
docker stats
```

## 資料庫管理

### 備份資料庫
```bash
docker-compose exec db pg_dump -U postgres recruitment_crm > backup.sql
```

### 還原資料庫
```bash
docker-compose exec -T db psql -U postgres recruitment_crm < backup.sql
```

### 重置資料庫（會刪除所有資料）
```bash
docker-compose down -v
docker-compose up -d
```

## 網路隔離

所有服務都在獨立的 Docker 網路 `tcucrm-network` 中運行，不會與本機或其他 Docker 專案衝突：

- 資料庫端口映射到本機 `5434`（避免與本機 PostgreSQL 衝突）
- 後端 API 端口映射到本機 `5001`
- 前端端口映射到本機 `8888`

容器間通訊使用內部網路名稱（如 `backend`、`db`），不依賴外部端口。

## 故障排除

### 後端無法連接資料庫
```bash
# 檢查資料庫是否正常運行
docker-compose ps db

# 查看資料庫日誌
docker-compose logs db

# 測試資料庫連接
docker-compose exec db psql -U postgres -c "SELECT 1"
```

### 前端無法連接後端
```bash
# 檢查後端是否正常運行
curl http://localhost:5000/health

# 查看 nginx 配置
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### 清理並重新開始
```bash
# 停止並刪除所有容器和卷
docker-compose down -v

# 清理未使用的 Docker 資源
docker system prune -a

# 重新構建並啟動
docker-compose up -d --build
```

### 查看容器日誌
```bash
# 所有服務日誌
docker-compose logs

# 最近 100 行日誌
docker-compose logs --tail=100

# 實時日誌
docker-compose logs -f
```

## 生產環境建議

1. **更改預設密碼**: 修改 `docker-compose.yml` 中的資料庫密碼和 JWT_SECRET
2. **使用外部資料庫**: 考慮使用外部管理的 PostgreSQL 服務
3. **啟用 HTTPS**: 使用反向代理（如 Traefik 或 Nginx）處理 SSL/TLS
4. **資源限制**: 在 `docker-compose.yml` 中添加資源限制
5. **日誌管理**: 配置日誌輪轉和集中日誌管理
6. **備份策略**: 設置自動資料庫備份

## 更新應用

```bash
# 拉取最新代碼後
docker-compose up -d --build

# 只重建特定服務
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

