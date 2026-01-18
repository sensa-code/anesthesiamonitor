# 獸醫麻醉監測 App - 打包與部署指南

## 目錄
1. [前置準備](#前置準備)
2. [網頁版部署](#網頁版部署)
3. [Android App 打包](#android-app-打包)
4. [iOS App 打包](#ios-app-打包)
5. [上架應用商店](#上架應用商店)

---

## 前置準備

### 1. 安裝必要工具

```bash
# 安裝 EAS CLI（Expo Application Services）
npm install -g eas-cli

# 登入 Expo 帳號（需先在 https://expo.dev 註冊）
eas login
```

### 2. 設定專案

在 `app.json` 中更新以下資訊：

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.您的公司名.anesthesiamonitor"
    },
    "android": {
      "package": "com.您的公司名.anesthesiamonitor"
    },
    "extra": {
      "eas": {
        "projectId": "您的 EAS 專案 ID"
      }
    },
    "owner": "您的 Expo 用戶名"
  }
}
```

### 3. 初始化 EAS 專案

```bash
# 在專案目錄下執行
eas build:configure
```

### 4. 替換應用程式圖示（可選）

目前使用的是佔位圖示，建議替換為正式圖示：
- `assets/icon.png` - 1024x1024 像素，應用程式主圖示
- `assets/adaptive-icon.png` - 1024x1024 像素，Android 自適應圖示
- `assets/splash.png` - 1284x2778 像素，啟動畫面
- `assets/favicon.png` - 48x48 像素，網頁版圖示

---

## 網頁版部署

### 方法一：本地開發/預覽

```bash
# 啟動網頁版開發伺服器
npm run web
```

瀏覽器會自動開啟 `http://localhost:8081`

### 方法二：建置靜態網頁

```bash
# 建置網頁版
npm run build:web
```

這會在 `dist` 目錄產生靜態檔案。

### 部署到各平台

#### Vercel（推薦）
```bash
# 安裝 Vercel CLI
npm install -g vercel

# 部署
cd dist
vercel
```

#### Netlify
```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 部署
netlify deploy --dir=dist --prod
```

#### GitHub Pages
1. 在 GitHub 建立 repository
2. 將 `dist` 目錄的內容推送到 `gh-pages` 分支
3. 在 repository 設定中啟用 GitHub Pages

#### 自有伺服器
將 `dist` 目錄的所有檔案上傳到您的網頁伺服器（如 Nginx、Apache）。

---

## Android App 打包

### 開發測試版（APK）

```bash
# 建置開發測試 APK
npm run build:android:preview
```

建置完成後，可在 Expo 儀表板下載 APK 檔案，直接安裝到 Android 裝置測試。

### 正式發布版（AAB）

```bash
# 建置正式版（App Bundle 格式，用於上架 Google Play）
npm run build:android:prod
```

### 本地建置（進階）

如果需要在本地建置，需要：
1. 安裝 Android Studio
2. 設定 Android SDK
3. 執行：

```bash
# 產生原生專案
npx expo prebuild --platform android

# 使用 Android Studio 開啟 android 目錄進行建置
```

---

## iOS App 打包

> **注意**：iOS 建置需要 Apple Developer 帳號（年費 $99 USD）

### 開發測試版（Simulator）

```bash
# 建置模擬器版本
npm run build:ios:dev
```

### 內部測試版

```bash
# 建置內部測試版（Ad Hoc 發布）
npm run build:ios:preview
```

需要先在 Apple Developer 後台註冊測試裝置的 UDID。

### 正式發布版

```bash
# 建置 App Store 版本
npm run build:ios:prod
```

### 本地建置（進階）

需要 macOS 電腦和 Xcode：

```bash
# 產生原生專案
npx expo prebuild --platform ios

# 使用 Xcode 開啟 ios 目錄進行建置
```

---

## 上架應用商店

### Google Play Store

1. **準備工作**
   - 註冊 Google Play Developer 帳號（一次性費用 $25 USD）
   - 建立應用程式
   - 準備商店資訊（描述、截圖、隱私政策等）

2. **建置與上傳**
   ```bash
   # 建置正式版
   npm run build:android:prod

   # 自動提交到 Google Play
   npm run submit:android
   ```

3. **設定自動提交**（在 `eas.json` 中配置）
   ```json
   {
     "submit": {
       "production": {
         "android": {
           "serviceAccountKeyPath": "./google-service-account.json",
           "track": "internal"
         }
       }
     }
   }
   ```

### Apple App Store

1. **準備工作**
   - 註冊 Apple Developer 帳號（年費 $99 USD）
   - 在 App Store Connect 建立應用程式
   - 準備商店資訊

2. **建置與上傳**
   ```bash
   # 建置正式版
   npm run build:ios:prod

   # 提交到 App Store
   npm run submit:ios
   ```

3. **設定自動提交**（在 `eas.json` 中配置）
   ```json
   {
     "submit": {
       "production": {
         "ios": {
           "appleId": "your-apple-id@email.com",
           "ascAppId": "your-app-store-connect-app-id"
         }
       }
     }
   }
   ```

---

## 常用指令總覽

| 指令 | 說明 |
|------|------|
| `npm run start` | 啟動 Expo 開發伺服器 |
| `npm run web` | 啟動網頁版開發伺服器 |
| `npm run android` | 在 Android 模擬器/裝置執行 |
| `npm run ios` | 在 iOS 模擬器執行 |
| `npm run build:web` | 建置網頁版靜態檔案 |
| `npm run build:android:preview` | 建置 Android APK（測試用） |
| `npm run build:android:prod` | 建置 Android AAB（上架用） |
| `npm run build:ios:preview` | 建置 iOS 測試版 |
| `npm run build:ios:prod` | 建置 iOS 正式版 |
| `npm run build:all:preview` | 同時建置 Android 和 iOS 測試版 |
| `npm run build:all:prod` | 同時建置 Android 和 iOS 正式版 |

---

## 快速開始（TL;DR）

### 網頁版
```bash
npm run build:web
# 將 dist 目錄部署到任何網頁伺服器
```

### Android
```bash
npm install -g eas-cli
eas login
npm run build:android:preview
# 下載 APK 安裝到手機
```

### iOS
```bash
npm install -g eas-cli
eas login
# 需要 Apple Developer 帳號
npm run build:ios:preview
```

---

## 疑難排解

### 建置失敗
- 確認已登入 EAS：`eas whoami`
- 檢查網路連線
- 查看 Expo 儀表板上的建置日誌

### 圖示顯示異常
- 確認圖示尺寸正確
- 確認 PNG 格式無誤
- 重新執行 `node scripts/generate-icons.js`

### 更多幫助
- [Expo 官方文件](https://docs.expo.dev/)
- [EAS Build 文件](https://docs.expo.dev/build/introduction/)
- [EAS Submit 文件](https://docs.expo.dev/submit/introduction/)
