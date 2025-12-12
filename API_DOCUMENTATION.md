# 招生CRM系統 API 文件

## 概述

招生CRM系統提供完整的RESTful API，用於管理學校資訊、聯絡人、互動記錄和搜尋功能。所有API端點都需要JWT認證。

## 認證

所有API請求都需要在Header中包含JWT token：

```
Authorization: Bearer <your-jwt-token>
```

## 基本回應格式

### 成功回應
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功訊息"
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息",
    "details": [...] // 可選的詳細錯誤資訊
  }
}
```

## API 端點

### 學校管理 API

#### 獲取學校列表
- **GET** `/api/schools`
- **查詢參數**:
  - `page` (number): 頁碼，預設 1
  - `limit` (number): 每頁數量，預設 20，最大 100
  - `country` (string): 國家篩選
  - `region` (string): 地區篩選
  - `schoolType` (string): 學校類型篩選
  - `relationshipStatus` (string): 關係狀態篩選
  - `query` (string): 搜尋關鍵字
  - `sortBy` (string): 排序欄位
  - `sortOrder` (string): 排序方向 (asc/desc)

#### 創建學校記錄
- **POST** `/api/schools`
- **請求體**:
```json
{
  "name": "學校名稱",
  "country": "國家",
  "region": "地區",
  "schoolType": "high_school|university|vocational|other",
  "website": "https://school.edu.tw",
  "relationshipStatus": "potential|active|partnered|paused"
}
```

#### 獲取學校詳情
- **GET** `/api/schools/:id`

#### 更新學校資訊
- **PUT** `/api/schools/:id`
- **請求體**: 與創建相同，所有欄位可選

#### 刪除學校記錄
- **DELETE** `/api/schools/:id`

#### 更新學校關係狀態
- **PUT** `/api/schools/:id/relationship-status`
- **請求體**:
```json
{
  "relationshipStatus": "potential|active|partnered|paused"
}
```

### 聯絡人管理 API

#### 獲取聯絡人列表
- **GET** `/api/contacts`
- **查詢參數**:
  - `page`, `limit`: 分頁參數
  - `schoolId` (string): 學校ID篩選
  - `email` (string): 電郵篩選
  - `isPrimary` (boolean): 主要聯絡人篩選
  - `query` (string): 搜尋關鍵字

#### 創建聯絡人記錄
- **POST** `/api/contacts`
- **請求體**:
```json
{
  "schoolId": "uuid",
  "name": "聯絡人姓名",
  "email": "email@example.com",
  "phone": "電話號碼",
  "position": "職位",
  "isPrimary": false
}
```

#### 批次創建聯絡人
- **POST** `/api/contacts/batch`
- **請求體**:
```json
{
  "contacts": [
    {
      "schoolId": "uuid",
      "name": "聯絡人1",
      "email": "contact1@example.com"
    }
  ]
}
```

#### 獲取學校聯絡人
- **GET** `/api/schools/:schoolId/contacts`

#### 獲取聯絡人詳情
- **GET** `/api/contacts/:id`

#### 更新聯絡人資訊
- **PUT** `/api/contacts/:id`

#### 批次更新聯絡人
- **PUT** `/api/contacts/batch`
- **請求體**:
```json
{
  "updates": [
    {
      "id": "uuid",
      "data": {
        "name": "新名稱"
      }
    }
  ]
}
```

#### 刪除聯絡人記錄
- **DELETE** `/api/contacts/:id`

### 互動記錄 API

#### 獲取互動記錄列表
- **GET** `/api/interactions`
- **查詢參數**:
  - `page`, `limit`: 分頁參數
  - `schoolId` (string): 學校ID篩選
  - `contactMethod` (string): 聯繫方式篩選
  - `dateFrom`, `dateTo` (Date): 日期範圍篩選
  - `followUpRequired` (boolean): 需要跟進篩選
  - `createdBy` (string): 創建者篩選
  - `query` (string): 搜尋關鍵字

#### 創建互動記錄
- **POST** `/api/interactions`
- **請求體**:
```json
{
  "schoolId": "uuid",
  "contactMethod": "email|phone|visit|video_call|other",
  "date": "2023-12-10T10:00:00Z",
  "notes": "互動記錄內容",
  "followUpRequired": true,
  "followUpDate": "2023-12-15T10:00:00Z"
}
```

#### 獲取學校互動歷史
- **GET** `/api/schools/:schoolId/interactions`

#### 獲取學校互動統計
- **GET** `/api/schools/:schoolId/interactions/stats`

#### 獲取待跟進記錄
- **GET** `/api/interactions/follow-ups`
- **查詢參數**:
  - `beforeDate` (Date): 截止日期

#### 獲取互動記錄詳情
- **GET** `/api/interactions/:id`

#### 更新互動記錄
- **PUT** `/api/interactions/:id`

#### 刪除互動記錄
- **DELETE** `/api/interactions/:id`

### 搜尋和篩選 API

#### 基本搜尋
- **GET** `/api/search`
- **查詢參數**:
  - `query` (string): 搜尋關鍵字
  - `country`, `region`, `schoolType`, `relationshipStatus`, `mouStatus`: 篩選條件
  - `sortBy`, `sortOrder`: 排序參數
  - `page`, `limit`: 分頁參數

#### 進階搜尋
- **POST** `/api/search/advanced`
- **請求體**: 與基本搜尋相同參數

#### 清除篩選條件
- **GET** `/api/search/clear`
- **查詢參數**: 排序和分頁參數

#### 匯出搜尋結果
- **POST** `/api/search/export`
- **請求體**:
```json
{
  "query": "搜尋關鍵字",
  "format": "csv|json|excel",
  "fields": ["id", "name", "country"],
  "country": "篩選條件"
}
```

#### 獲取搜尋建議
- **GET** `/api/search/suggestions`
- **查詢參數**:
  - `query` (string): 搜尋關鍵字
  - `type` (string): 建議類型 (all|schools|contacts|countries|regions)

## 錯誤代碼

- `VALIDATION_ERROR`: 輸入資料驗證失敗
- `UNAUTHORIZED`: 未授權存取
- `INVALID_TOKEN`: 無效的認證令牌
- `INVALID_ID`: 無效的ID格式
- `SCHOOL_NOT_FOUND`: 找不到學校記錄
- `CONTACT_NOT_FOUND`: 找不到聯絡人記錄
- `INTERACTION_NOT_FOUND`: 找不到互動記錄
- `UPDATE_FAILED`: 更新操作失敗

## 資料類型

### SchoolType
- `high_school`: 高中
- `university`: 大學
- `vocational`: 技職學校
- `other`: 其他

### RelationshipStatus
- `potential`: 潛在合作
- `active`: 積極聯繫
- `partnered`: 正式合作
- `paused`: 暫停聯繫

### ContactMethod
- `email`: 電郵
- `phone`: 電話
- `visit`: 拜訪
- `video_call`: 視訊通話
- `other`: 其他

### MOUStatus
- `none`: 無
- `negotiating`: 洽談中
- `signed`: 已簽訂
- `expired`: 已到期

## 分頁回應格式

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 200,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 使用範例

### 搜尋台灣的大學
```bash
curl -X GET "https://api.example.com/api/search?query=大學&country=台灣&schoolType=university" \
  -H "Authorization: Bearer your-jwt-token"
```

### 創建新學校記錄
```bash
curl -X POST "https://api.example.com/api/schools" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試大學",
    "country": "台灣",
    "region": "台北市",
    "schoolType": "university",
    "website": "https://test.edu.tw"
  }'
```

### 匯出搜尋結果為CSV
```bash
curl -X POST "https://api.example.com/api/search/export" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "country": "台灣",
    "fields": ["name", "country", "region", "schoolType"]
  }'
```