# 生產環境部署指南

本指南說明如何在 Lightsail 或其他 Linux 伺服器上部署招生CRM系統。

## 前置需求

- Ubuntu 20.04+ 或類似 Linux 發行版
- 至少 2GB RAM
- 至少 10GB 可用磁碟空間
- Docker 和 Docker Compose
- Git

## 快速部署

### 1. 安裝 Docker 和 Docker Compose

```bash
# 更新系統
sudo apt update
sudo apt upgrade -y

# 安裝 Docker
sudo apt install -y docker.io docker-compose

# 將當前用戶加入 docker 群組（需要重新登入才能生效）
sudo usermod -aG docker $USER

# 啟動 Docker 服務
sudo systemctl enable docker
sudo systemctl start docker

# 驗證安裝
docker --version
docker-compose --version
```

### 2. 克隆專案

```bash
git clone https://github.com/tzustu63/ogacrm.git
cd ogacrm
```

### 3. 執行部署腳本

```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

部署腳本會自動：
- 檢查 Docker 環境
- 創建 `.env` 文件（如果不存在）
- 生成隨機密鑰
- 構建並啟動所有服務

### 4. 手動配置（可選）

如果需要自定義配置，編輯 `.env` 文件：

```bash
nano .env
```

重要配置項：
- `DB_PASSWORD`: 資料庫密碼（必須更改）
- `JWT_SECRET`: JWT 簽名密鑰（必須更改）
- `ENCRYPTION_KEY`: 加密金鑰（必須更改，64個十六進制字符）

## 服務管理

### 查看服務狀態

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 查看日誌

```bash
# 所有服務日誌
docker-compose -f docker-compose.prod.yml logs -f

# 特定服務日誌
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

### 重啟服務

```bash
# 重啟所有服務
docker-compose -f docker-compose.prod.yml restart

# 重啟特定服務
docker-compose -f docker-compose.prod.yml restart backend
```

### 停止服務

```bash
docker-compose -f docker-compose.prod.yml down
```

### 更新應用

```bash
# 拉取最新代碼
git pull

# 重新構建並啟動
docker-compose -f docker-compose.prod.yml up -d --build
```

## 資料庫管理

### 備份資料庫

```bash
# 手動備份
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres recruitment_crm > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用備份腳本（如果有的話）
./scripts/backup-db.sh
```

### 還原資料庫

```bash
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres recruitment_crm < backups/backup_YYYYMMDD_HHMMSS.sql
```

### 自動備份（使用 Cron）

編輯 crontab：

```bash
crontab -e
```

添加每日備份任務（每天凌晨 2 點）：

```bash
0 2 * * * cd /path/to/ogacrm && docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres recruitment_crm > backups/backup_$(date +\%Y\%m\%d).sql && find backups/ -name "backup_*.sql" -mtime +7 -delete
```

## Nginx 反向代理配置（推薦）

為了使用域名和 HTTPS，建議在伺服器上安裝 Nginx 作為反向代理。

### 1. 安裝 Nginx

```bash
sudo apt install -y nginx
```

### 2. 配置反向代理

創建配置文件：

```bash
sudo nano /etc/nginx/sites-available/tcucrm
```

配置內容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替換為你的域名

    # 重定向到 HTTPS（如果使用 Let's Encrypt）
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:8888;  # 前端容器端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

啟用配置：

```bash
sudo ln -s /etc/nginx/sites-available/tcucrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安裝 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d your-domain.com

# 自動續期（已自動配置）
sudo certbot renew --dry-run
```

## 防火牆配置

如果使用 UFW：

```bash
# 允許 SSH
sudo ufw allow 22/tcp

# 允許 HTTP
sudo ufw allow 80/tcp

# 允許 HTTPS
sudo ufw allow 443/tcp

# 啟用防火牆
sudo ufw enable
```

## 監控和維護

### 查看資源使用

```bash
docker stats
```

### 清理未使用的資源

```bash
# 清理未使用的映像、容器和網路
docker system prune -a

# 清理未使用的卷（謹慎使用）
docker volume prune
```

### 檢查日誌大小

```bash
# 查看日誌文件大小
du -sh logs/
```

## 故障排除

### 服務無法啟動

1. 檢查日誌：
```bash
docker-compose -f docker-compose.prod.yml logs
```

2. 檢查環境變數：
```bash
cat .env
```

3. 檢查端口是否被佔用：
```bash
sudo netstat -tulpn | grep -E ':(80|443|5000|5432)'
```

### 資料庫連接失敗

1. 檢查資料庫容器狀態：
```bash
docker-compose -f docker-compose.prod.yml ps db
```

2. 檢查資料庫日誌：
```bash
docker-compose -f docker-compose.prod.yml logs db
```

3. 測試資料庫連接：
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT 1"
```

### 前端無法訪問後端

1. 檢查網路連接：
```bash
docker-compose -f docker-compose.prod.yml exec frontend ping backend
```

2. 檢查後端健康狀態：
```bash
# 從容器內部檢查（使用容器內端口）
docker-compose -f docker-compose.prod.yml exec backend node -e "require('http').get('http://localhost:5000/health', (r) => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>console.log(d)); })"

# 從主機檢查（使用主機端口）
curl http://localhost:5006/health
```

## 安全建議

1. **更改預設密碼**: 確保 `.env` 文件中的所有密碼都已更改
2. **限制資料庫端口**: 生產環境不應暴露資料庫端口到公網
3. **使用 HTTPS**: 配置 SSL/TLS 證書
4. **定期更新**: 定期更新系統和 Docker 映像
5. **備份策略**: 設置自動備份並測試還原流程
6. **監控日誌**: 定期檢查應用和系統日誌
7. **防火牆**: 只開放必要的端口

## 性能優化

1. **資源限制**: 已在 `docker-compose.prod.yml` 中配置資源限制
2. **資料庫優化**: 根據實際使用情況調整 PostgreSQL 配置
3. **緩存策略**: 前端已配置靜態資源緩存
4. **日誌輪轉**: 配置日誌輪轉避免磁碟空間耗盡

## 支援

如有問題，請查看：
- 專案 README.md
- DOCKER_DEPLOY.md（開發環境）
- GitHub Issues

