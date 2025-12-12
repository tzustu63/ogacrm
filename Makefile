.PHONY: help build up down restart logs clean

help: ## 顯示幫助訊息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## 構建所有 Docker 映像
	docker-compose build

up: ## 啟動所有服務
	docker-compose up -d

down: ## 停止所有服務
	docker-compose down

restart: ## 重啟所有服務
	docker-compose restart

logs: ## 查看所有服務日誌
	docker-compose logs -f

logs-backend: ## 查看後端日誌
	docker-compose logs -f backend

logs-frontend: ## 查看前端日誌
	docker-compose logs -f frontend

logs-db: ## 查看資料庫日誌
	docker-compose logs -f db

ps: ## 查看服務狀態
	docker-compose ps

clean: ## 停止服務並刪除卷（會刪除資料庫資料）
	docker-compose down -v

clean-all: clean ## 清理所有 Docker 資源（包括未使用的映像）
	docker system prune -a --volumes -f

rebuild: down build up ## 重新構建並啟動服務

shell-backend: ## 進入後端容器
	docker-compose exec backend sh

shell-db: ## 進入資料庫容器
	docker-compose exec db psql -U postgres -d recruitment_crm

backup-db: ## 備份資料庫
	docker-compose exec -T db pg_dump -U postgres recruitment_crm > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "備份已保存為 backup_$(shell date +%Y%m%d_%H%M%S).sql"




