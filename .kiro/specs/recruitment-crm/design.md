# 招生CRM系統設計文件

## 概述

招生CRM系統是一個基於Web的客戶關係管理應用程式，專為教育機構的招生團隊設計。系統採用現代化的三層架構，包含前端用戶界面、後端API服務和資料庫層。系統支援多用戶同時使用，提供完整的學校資訊管理、互動追蹤、合作管理和報表分析功能。

## 架構

### 系統架構
- **前端層**: React.js單頁應用程式，提供響應式用戶界面
- **API層**: Node.js/Express.js RESTful API服務
- **資料庫層**: PostgreSQL關聯式資料庫
- **認證層**: JWT基礎的身份驗證和授權
- **檔案儲存**: 本地檔案系統或雲端儲存服務

### 部署架構
- **開發環境**: Docker容器化部署
- **生產環境**: 雲端平台部署（AWS/Azure/GCP）
- **資料庫**: 託管資料庫服務
- **CDN**: 靜態資源分發網路

## 組件和介面

### 核心組件

#### 1. 學校管理組件 (SchoolManager)
- **職責**: 管理學校基本資訊的CRUD操作
- **介面**: 
  - `createSchool(schoolData)`: 創建新學校記錄
  - `updateSchool(schoolId, updates)`: 更新學校資訊
  - `getSchool(schoolId)`: 獲取單一學校詳細資訊
  - `searchSchools(criteria)`: 搜尋和篩選學校

#### 2. 聯絡人管理組件 (ContactManager)
- **職責**: 管理學校聯絡人資訊
- **介面**:
  - `addContact(schoolId, contactData)`: 新增聯絡人
  - `updateContact(contactId, updates)`: 更新聯絡人資訊
  - `getContacts(schoolId)`: 獲取學校所有聯絡人

#### 3. 互動記錄組件 (InteractionTracker)
- **職責**: 記錄和追蹤與學校的互動歷史
- **介面**:
  - `logInteraction(schoolId, interactionData)`: 記錄新互動
  - `getInteractionHistory(schoolId)`: 獲取互動歷史
  - `updateRelationshipStatus(schoolId, status)`: 更新關係狀態

#### 4. 合作管理組件 (PartnershipManager)
- **職責**: 管理MOU狀態和合作相關資訊
- **介面**:
  - `updateMOUStatus(schoolId, status, expiryDate)`: 更新MOU狀態
  - `recordReferral(schoolId, count)`: 記錄推薦學生數
  - `scheduleEvent(schoolId, eventData)`: 記錄招生說明會

#### 5. 搜尋和篩選組件 (SearchEngine)
- **職責**: 提供強大的搜尋和篩選功能
- **介面**:
  - `search(query, filters)`: 執行搜尋和篩選
  - `buildFilterCriteria(filterOptions)`: 建構篩選條件
  - `exportResults(results, format)`: 匯出搜尋結果

### API端點設計

```
GET    /api/schools              - 獲取學校列表
POST   /api/schools              - 創建新學校
GET    /api/schools/:id          - 獲取特定學校詳情
PUT    /api/schools/:id          - 更新學校資訊
DELETE /api/schools/:id          - 刪除學校記錄

GET    /api/schools/:id/contacts - 獲取學校聯絡人
POST   /api/schools/:id/contacts - 新增聯絡人
PUT    /api/contacts/:id         - 更新聯絡人
DELETE /api/contacts/:id         - 刪除聯絡人

GET    /api/schools/:id/interactions - 獲取互動記錄
POST   /api/schools/:id/interactions - 新增互動記錄
PUT    /api/interactions/:id         - 更新互動記錄

GET    /api/search               - 搜尋學校
POST   /api/export               - 匯出資料
```

## 資料模型

### School (學校)
```typescript
interface School {
  id: string;
  name: string;
  country: string;
  region: string;
  schoolType: SchoolType;
  website?: string;
  relationshipStatus: RelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

enum SchoolType {
  HIGH_SCHOOL = 'high_school',
  UNIVERSITY = 'university',
  VOCATIONAL = 'vocational',
  OTHER = 'other'
}

enum RelationshipStatus {
  POTENTIAL = 'potential',
  ACTIVE = 'active',
  PARTNERED = 'partnered',
  PAUSED = 'paused'
}
```

### Contact (聯絡人)
```typescript
interface Contact {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Interaction (互動記錄)
```typescript
interface Interaction {
  id: string;
  schoolId: string;
  contactMethod: ContactMethod;
  date: Date;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  createdBy: string;
  createdAt: Date;
}

enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  VISIT = 'visit',
  VIDEO_CALL = 'video_call',
  OTHER = 'other'
}
```

### Partnership (合作資訊)
```typescript
interface Partnership {
  id: string;
  schoolId: string;
  mouStatus: MOUStatus;
  mouSignedDate?: Date;
  mouExpiryDate?: Date;
  referralCount: number;
  eventsHeld: number;
  createdAt: Date;
  updatedAt: Date;
}

enum MOUStatus {
  NONE = 'none',
  NEGOTIATING = 'negotiating',
  SIGNED = 'signed',
  EXPIRED = 'expired'
}
```

### Preference (偏好設定)
```typescript
interface Preference {
  id: string;
  schoolId: string;
  preferredContactMethod: ContactMethod;
  programsOfInterest: string[];
  bestContactTime: string;
  timezone: string;
  specialRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 正確性屬性

*屬性是一個特徵或行為，應該在系統的所有有效執行中保持為真——本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規格和機器可驗證正確性保證之間的橋樑。*

### 屬性反思

在分析所有可測試的驗收標準後，我識別出以下需要合併或簡化的冗餘屬性：
- 學校資料的CRUD操作可以合併為一個綜合的資料完整性屬性
- 聯絡人管理的多個屬性可以合併為關聯性和驗證屬性
- 互動記錄的日期更新邏輯可以合併為時間序列一致性屬性
- 搜尋和篩選的多個屬性可以合併為查詢結果正確性屬性

### 核心屬性

**屬性 1: 學校資料完整性**
*對於任何*學校記錄，當執行創建、更新或查詢操作時，系統應該保持資料的完整性和一致性，包括必填欄位驗證和關聯資料的正確維護
**驗證需求: 1.1, 1.3, 1.4, 1.5**

**屬性 2: 電郵格式驗證**
*對於任何*輸入的電郵地址，系統應該正確驗證其格式符合標準電郵規範
**驗證需求: 2.2**

**屬性 3: 聯絡人關聯一致性**
*對於任何*學校和其聯絡人，當創建、更新或查詢聯絡人時，系統應該正確維護學校與聯絡人之間的關聯關係
**驗證需求: 2.1, 2.3, 2.4, 2.5**

**屬性 4: 互動記錄時間序列**
*對於任何*學校的互動記錄，系統應該正確維護首次聯繫日期和最後聯繫日期，並按時間順序顯示所有互動記錄
**驗證需求: 3.1, 3.2, 3.3, 3.4**

**屬性 5: 關係狀態同步**
*對於任何*學校記錄，當更新互動記錄中的關係狀態時，學校記錄的當前狀態應該同步更新
**驗證需求: 3.5**

**屬性 6: MOU狀態驗證**
*對於任何*合作備忘錄，當狀態設定為已簽訂時，系統應該要求並驗證到期日期的存在
**驗證需求: 4.2**

**屬性 7: MOU到期提醒**
*對於任何*接近到期的合作備忘錄，系統應該提供適當的到期提醒功能
**驗證需求: 4.3**

**屬性 8: 數值累計正確性**
*對於任何*學校的推薦學生數和招生說明會次數，系統應該正確累計並維護這些數值的準確性
**驗證需求: 4.4, 4.5**

**屬性 9: 偏好設定儲存**
*對於任何*學校的偏好設定，包括聯繫方式、感興趣科系、最佳聯繫時間和特殊需求，系統應該正確儲存並處理時區差異
**驗證需求: 5.1, 5.2, 5.3, 5.4**

**屬性 10: 搜尋結果正確性**
*對於任何*搜尋查詢和篩選條件，系統應該返回符合所有指定條件的學校記錄，並在無結果時顯示適當訊息
**驗證需求: 6.1, 6.2, 6.3, 6.4**

**屬性 11: 篩選重置一致性**
*對於任何*已應用的篩選條件，當使用者清除篩選時，系統應該恢復顯示完整的學校記錄列表
**驗證需求: 6.5**

**屬性 12: 資料安全性**
*對於任何*敏感資訊，系統應該使用適當的加密方式保護資料，並在使用者存取時要求身份驗證和記錄存取日誌
**驗證需求: 7.2, 7.3**

**屬性 13: 資料備份復原**
*對於任何*資料異常情況，系統應該提供有效的資料備份和復原機制
**驗證需求: 7.4**

**屬性 14: 匯出資料完整性**
*對於任何*匯出操作，系統應該確保匯出資料的格式正確性和完整性
**驗證需求: 7.5**

## 錯誤處理

### 輸入驗證錯誤
- **無效資料格式**: 返回具體的驗證錯誤訊息
- **缺少必填欄位**: 明確指出缺少的欄位
- **重複資料**: 提供友善的重複資料警告

### 系統錯誤
- **資料庫連線失敗**: 提供重試機制和錯誤日誌
- **API請求超時**: 實施請求重試和降級策略
- **檔案上傳失敗**: 提供上傳狀態回饋和錯誤處理

### 業務邏輯錯誤
- **權限不足**: 返回適當的授權錯誤訊息
- **資料衝突**: 提供衝突解決選項
- **操作限制**: 明確說明操作限制原因

### 錯誤回應格式
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
  };
}
```

## 測試策略

### 雙重測試方法

系統將採用單元測試和屬性基礎測試的雙重方法：

#### 單元測試
- **具體範例驗證**: 測試特定的業務場景和邊界情況
- **整合點測試**: 驗證組件間的介面和資料流
- **錯誤條件測試**: 確保錯誤情況得到適當處理
- **API端點測試**: 驗證RESTful API的正確性

#### 屬性基礎測試
- **測試框架**: 使用fast-check (JavaScript/TypeScript)進行屬性基礎測試
- **測試配置**: 每個屬性測試執行最少100次迭代以確保隨機性覆蓋
- **屬性標記**: 每個屬性基礎測試必須包含註解，明確引用設計文件中的正確性屬性
- **標記格式**: 使用格式 '**Feature: recruitment-crm, Property {number}: {property_text}**'

#### 測試覆蓋範圍
- **功能測試**: 驗證所有業務需求的實現
- **效能測試**: 確保系統在預期負載下正常運作
- **安全測試**: 驗證認證、授權和資料保護機制
- **相容性測試**: 確保跨瀏覽器和裝置的相容性

#### 測試資料管理
- **測試資料庫**: 使用獨立的測試資料庫環境
- **資料清理**: 每次測試後自動清理測試資料
- **資料生成**: 使用工廠模式生成測試資料
- **邊界測試**: 包含空值、極值和異常資料的測試

### 持續整合
- **自動化測試**: 所有測試在程式碼提交時自動執行
- **測試報告**: 生成詳細的測試覆蓋率和結果報告
- **品質門檻**: 設定最低測試覆蓋率要求
- **回歸測試**: 確保新功能不影響現有功能