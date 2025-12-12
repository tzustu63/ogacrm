# 招生CRM系統 - 前端應用程式

這是招生CRM系統的前端應用程式，使用React + TypeScript + Material-UI構建。

## 技術棧

- **React 18** - 前端框架
- **TypeScript** - 類型安全
- **Material-UI (MUI)** - UI組件庫
- **Redux Toolkit** - 狀態管理
- **React Router** - 路由管理
- **Axios** - HTTP客戶端
- **React Hook Form** - 表單處理
- **Yup** - 表單驗證
- **Day.js** - 日期處理
- **Vite** - 構建工具
- **Vitest** - 測試框架

## 專案結構

```
frontend/
├── src/
│   ├── components/          # 可重用組件
│   │   ├── Layout/         # 佈局組件
│   │   └── ProtectedRoute.tsx
│   ├── pages/              # 頁面組件
│   ├── services/           # API服務
│   │   ├── api/           # API端點
│   │   └── httpClient.ts  # HTTP客戶端
│   ├── store/             # Redux store
│   │   └── slices/        # Redux slices
│   ├── types/             # TypeScript類型定義
│   ├── utils/             # 工具函數
│   ├── theme/             # Material-UI主題
│   └── test/              # 測試配置
├── public/                # 靜態資源
└── package.json
```

## 開發指令

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 構建生產版本
npm run build

# 預覽生產版本
npm run preview

# 運行測試
npm run test

# 運行測試（監視模式）
npm run test:watch

# 運行測試覆蓋率
npm run test:coverage

# 代碼檢查
npm run lint

# 修復代碼格式
npm run lint:fix
```

## 功能模組

### 已實作的基礎架構

1. **認證系統**
   - JWT token管理
   - 登入/登出功能
   - 受保護路由

2. **狀態管理**
   - Redux Toolkit配置
   - 各功能模組的slice
   - 異步操作處理

3. **API客戶端**
   - HTTP攔截器
   - 錯誤處理
   - 認證token自動添加

4. **UI框架**
   - Material-UI主題配置
   - 響應式佈局
   - 中文本地化

5. **表單處理**
   - React Hook Form整合
   - Yup驗證schema
   - 錯誤處理

### 待實作功能

- 學校管理介面
- 聯絡人管理介面
- 互動記錄介面
- 合作管理介面
- 搜尋篩選介面
- 資料匯出功能

## 開發規範

### 代碼風格

- 使用TypeScript嚴格模式
- 遵循ESLint規則
- 使用函數式組件和Hooks
- 採用Material-UI設計系統

### 文件結構

- 組件使用PascalCase命名
- 文件使用camelCase命名
- 類型定義集中在types目錄
- API服務按功能模組分組

### 狀態管理

- 使用Redux Toolkit
- 異步操作使用createAsyncThunk
- 保持state結構扁平化
- 避免在組件中直接修改state

## API整合

前端應用程式通過代理配置連接到後端API：

- 開發環境：`http://localhost:5000/api`
- 所有API請求自動添加認證token
- 統一的錯誤處理和用戶提示

## 部署

1. 構建生產版本：`npm run build`
2. 將`dist`目錄部署到靜態文件服務器
3. 配置代理或環境變量指向後端API

## 注意事項

- 確保後端API服務正在運行
- 檢查CORS配置允許前端域名
- 生產環境需要配置正確的API基礎URL