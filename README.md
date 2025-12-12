# 招生CRM系統 (Recruitment CRM System)

一個專為教育機構設計的客戶關係管理系統，用於管理與合作學校的關係、追蹤互動記錄、維護合作協議，並優化招生流程。

## 技術架構

- **後端**: Node.js + Express.js + TypeScript
- **資料庫**: PostgreSQL
- **認證**: JWT (JSON Web Tokens)
- **測試**: Jest + fast-check (屬性基礎測試)
- **日誌**: Winston
- **驗證**: Joi

## 專案結構

```
├── src/
│   ├── config/          # 配置文件
│   │   └── database.ts  # 資料庫配置
│   ├── middleware/      # 中介軟體
│   │   ├── auth.ts      # JWT認證中介軟體
│   │   └── errorHandler.ts # 錯誤處理中介軟體
│   ├── types/           # TypeScript類型定義
│   │   └── index.ts     # 核心資料模型
│   ├── utils/           # 工具函數
│   │   ├── logger.ts    # 日誌工具
│   │   └── validation.ts # 資料驗證工具
│   └── index.ts         # 應用程式入口點
├── tests/
│   ├── middleware/      # 中介軟體測試
│   ├── properties/      # 屬性基礎測試
│   ├── utils/           # 測試工具
│   └── setup.ts         # 測試環境設定
├── .env.example         # 環境變數範例
├── .env.test           # 測試環境變數
└── package.json        # 專案依賴和腳本
```

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境配置

複製環境變數範例文件並配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件，設定資料庫連線和JWT密鑰等配置。

### 3. 資料庫設定

確保PostgreSQL已安裝並運行，然後創建資料庫：

```sql
CREATE DATABASE recruitment_crm;
CREATE DATABASE recruitment_crm_test;
```

### 4. 運行測試

```bash
# 運行單元測試（不需要資料庫）
npm run test:unit

# 運行所有測試
npm test

# 運行測試並生成覆蓋率報告
npm run test:coverage
```

### 5. 啟動開發服務器

```bash
# 開發模式（自動重載）
npm run dev

# 建置並啟動生產版本
npm run build
npm start
```

## 可用腳本

- `npm run dev` - 啟動開發服務器（自動重載）
- `npm run build` - 建置TypeScript到JavaScript
- `npm start` - 啟動生產服務器
- `npm test` - 運行所有測試
- `npm run test:unit` - 運行單元測試（不需要資料庫）
- `npm run test:watch` - 監視模式運行測試
- `npm run test:coverage` - 運行測試並生成覆蓋率報告

## API端點

### 健康檢查
- `GET /health` - 服務健康狀態檢查

### 認證
- 所有 `/api/*` 端點都需要JWT認證（除了 `/api/auth/*`）
- 在請求頭中包含：`Authorization: Bearer <token>`

## 測試策略

本專案採用雙重測試方法：

### 單元測試
- 測試具體的業務場景和邊界情況
- 驗證組件間的介面和資料流
- 確保錯誤情況得到適當處理

### 屬性基礎測試 (Property-Based Testing)
- 使用 fast-check 庫進行屬性基礎測試
- 每個屬性測試執行最少100次迭代
- 驗證系統在各種輸入下的正確性屬性

## 環境變數

| 變數名 | 描述 | 預設值 |
|--------|------|--------|
| `PORT` | 服務器端口 | `3000` |
| `NODE_ENV` | 運行環境 | `development` |
| `DB_HOST` | 資料庫主機 | `localhost` |
| `DB_PORT` | 資料庫端口 | `5432` |
| `DB_NAME` | 資料庫名稱 | `recruitment_crm` |
| `DB_USER` | 資料庫用戶 | `postgres` |
| `DB_PASSWORD` | 資料庫密碼 | `password` |
| `JWT_SECRET` | JWT密鑰 | - |
| `JWT_EXPIRES_IN` | JWT過期時間 | `24h` |

## 開發指南

### 代碼風格
- 使用TypeScript進行類型安全開發
- 遵循ESLint和Prettier配置
- 使用有意義的變數和函數命名

### 測試要求
- 所有新功能都必須包含單元測試
- 核心業務邏輯需要屬性基礎測試
- 測試覆蓋率應保持在80%以上

### 提交規範
- 使用清晰的提交訊息
- 每個提交應該是一個邏輯單元
- 提交前確保所有測試通過

## 授權

MIT License