# 獸醫麻醉監測程式

## 專案簡介
此專案為獸醫麻醉監測應用程式，用於記錄手術中的生理數值，支援 Web 和 Mobile (iOS/Android) 平台。使用 React Native + Expo 開發。

---

## 專案架構

```
project-root/
├── packages/
│   ├── core/                      # 共用商業邏輯（平台無關）
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   └── index.ts       # 資料型別定義
│   │   │   ├── utils/
│   │   │   │   ├── formatters.ts  # 格式化函式
│   │   │   │   ├── validators.ts  # 驗證函式
│   │   │   │   └── csv.ts         # CSV 生成邏輯
│   │   │   └── index.ts           # 統一匯出
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── app/                       # Expo 應用
│       ├── src/
│       │   ├── components/        # UI 元件
│       │   │   ├── VitalChart.tsx
│       │   │   └── VitalInput.tsx
│       │   ├── navigation/
│       │   │   └── AppNavigator.tsx
│       │   ├── screens/           # 頁面
│       │   │   ├── MonitoringScreen.tsx
│       │   │   ├── PatientInfoScreen.tsx
│       │   │   └── ResultsScreen.tsx
│       │   ├── services/          # 平台相關服務
│       │   │   ├── storage.ts     # AsyncStorage 實作
│       │   │   └── export.ts      # 平台特定匯出
│       │   └── types/
│       │       └── index.ts       # 導航型別
│       ├── App.tsx
│       ├── app.json
│       ├── babel.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   └── snapshot.sh
├── .backups/
├── CLAUDE.md                      # 本檔案
├── package.json                   # 根目錄 workspaces 設定
└── tsconfig.json
```

---

## 開發規則

### 修改範圍規範

| 修改類型 | 可動的資料夾 | 注意事項 |
|----------|-------------|----------|
| 只改 UI/畫面 | `packages/app` | 不要動 core |
| 改共用邏輯 | `packages/core` | **必須先建立快照** |
| 全平台更新 | 全部 | **必須先建立快照** |

### 程式碼原則

1. **商業邏輯集中化**：所有資料處理、驗證邏輯、格式化函式放 `packages/core`
2. **平台特定邏輯分離**：儲存、匯出等平台相關功能放 `packages/app/src/services`
3. **共用程式碼引用方式**：
   ```typescript
   import { AnesthesiaSession, generateCSV, formatTime } from '@anesthesia/core'
   ```

---

## packages/core 內容說明

### 資料模型 (`models/index.ts`)
- `Species` - 動物種別類型
- `PatientInfo` - 病患資料介面
- `VitalRecord` - 生理數值記錄介面
- `AnesthesiaSession` - 麻醉療程介面

### 工具函式

**formatters.ts**
- `SPECIES_LABELS` - 物種標籤對照
- `formatTimestamp()` - 完整時間格式化
- `formatDateTime()` - 日期時間格式化
- `formatTime()` - 時間格式化
- `escapeCSV()` - CSV 跳脫處理
- `calculateDuration()` - 計算時長
- `generateSessionId()` - 產生 Session ID

**csv.ts**
- `generateCSV()` - 產生 CSV 內容

**validators.ts**
- `parseNumber()` - 數字解析
- `validatePatientInfo()` - 病患資料驗證
- `validateWeight()` - 體重驗證

---

## 版本控制機制（Git + 快照並用）

### Git 使用規範

**分支策略**
```
main                    # 穩定版本
├── develop             # 開發中版本
├── feature/xxx         # 功能開發
└── hotfix/xxx          # 緊急修復
```

**Commit 訊息格式**
```
[範圍] 動作：簡述

範圍：core / app / all
動作：add / update / fix / remove / refactor

範例：
[core] add：新增 formatTime 函式
[app] fix：修正匯出功能錯誤
[all] update：升級依賴套件
```

### 快照系統（修改 core 前必用）

#### 快照指令

```bash
# 建立快照（修改 core 前必須執行）
./scripts/snapshot.sh save "說明文字"

# 列出所有快照
./scripts/snapshot.sh list

# 回復到最新快照
./scripts/snapshot.sh restore

# 回復到指定快照（編號從 list 查看）
./scripts/snapshot.sh restore 2

# 清理舊快照（保留最近 10 個）
./scripts/snapshot.sh clean
```

#### Claude Code 執行規範

**修改 packages/core 前，必須：**
1. 執行 `./scripts/snapshot.sh save "修改說明"`
2. 告知使用者已建立快照
3. 開始進行修改

**當使用者說「回復上一動作」或「還原」時：**
1. 執行 `./scripts/snapshot.sh restore`
2. 回報回復結果

---

## 常用開發指令

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev:web          # 網頁版開發
npm run dev:mobile       # 手機版開發（啟動 Expo）

# 建置
npm run build:web        # 建置網頁版

# 在 packages/app 目錄下
npm run start            # 啟動 Expo
npm run build:android:preview  # Android 預覽版
npm run build:ios:preview      # iOS 預覽版
```

---

## 專案進度

### 已完成
- [x] 專案初始化
- [x] 病患資料輸入頁面
- [x] 生理監測頁面
- [x] 結果頁面與圖表
- [x] CSV/PDF 匯出功能
- [x] Monorepo 架構重構

### 待辦
- [ ] 歷史記錄查看功能
- [ ] 資料雲端同步

---

## 注意事項

### 敏感資訊
- 不要將 API 金鑰、密碼寫在程式碼中
- 使用環境變數管理敏感設定
- `.env` 檔案已加入 `.gitignore`

### 效能考量
- 圖片請先壓縮再放入專案
- 避免在 core 引入平台特定的大型套件
