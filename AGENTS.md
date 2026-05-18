# AGENTS.md

團隊共用規則與專案指引

## 技術棧

| 類別     | 技術            |
| -------- | --------------- |
| 框架     | Vue 3           |
| 建構工具 | Vite            |
| 型別     | TypeScript      |
| 模板語言 | Pug             |
| 樣式     | Tailwind CSS v4 |
| 套件管理 | pnpm            |
| 工具函式 | VueUse          |

## 套件管理

本專案使用 **pnpm**，所有指令請以 `pnpm` 執行，不要使用 `npm` 或 `yarn`。

## 常用指令

```sh
pnpm install      # 安裝依賴
pnpm dev          # 啟動開發伺服器
pnpm build        # 型別檢查 + 編譯打包
pnpm lint         # ESLint、Prettier、sort-package-json
pnpm type-check   # 僅型別檢查
pnpm preview      # 預覽打包結果
pnpm run fetch    # 一鍵更新所有資料（artists → events → sessions）
```

## 資料更新腳本

資料檔案（`src/data/`）透過三支 Node.js 腳本從 JKFace gRPC-Web API 抓取。

### 執行順序（有相依性，不可並行）

```
fetch:artists → fetch:events → fetch:sessions
```

使用 `pnpm run fetch` 會依正確順序循序執行全部三步。

### 各腳本職責

| 腳本             | 更新檔案                      | 說明                                                                                                     |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `fetch:artists`  | `artists.json`                | GetCollectionPageLineupInfo → 集合頁陣容女優                                                             |
| `fetch:events`   | `events.json`、`artists.json` | GetActivityLineup → 各活動女優；**同時**將 GetActivityLineup 發現但不在集合頁的新女優補入 `artists.json` |
| `fetch:sessions` | `sessions.json`               | GetReserveInfo → 各活動場次；依賴最新的 `artists.json` 進行名稱對照                                      |

### 注意事項

- 單獨執行 `fetch:sessions` 前，必須先確保 `artists.json` 已是最新狀態（先跑前兩步）
- `fetch:events` 只「補入」新女優，不會刪除 `fetch:artists` 已寫入的女優

## 開發慣例

- Vue 元件使用 Single File Component
- `<script>` 使用 `script setup` 搭配 TypeScript
- `<template>` 使用 Pug
- 新增或修改元件時，優先沿用既有檔案結構與命名方式

## 驗證要求

- 修改 Vue 或 TypeScript 邏輯後，至少執行 `pnpm type-check`
- 修改 Pug、格式化、Lint 規則或 `package.json` 後，至少執行 `pnpm lint`
- 準備合併或發版前，執行 `pnpm build`

## 樣式策略

- 除非有明確理由，否則一律優先使用 Tailwind CSS
- 只有在 Tailwind 不適合處理該樣式需求時，才可改用元件內 `scoped` CSS

## Icon 使用方式

- 不安裝額外 icon 套件，直接將 SVG 以字串常數定義在元件的 `<script setup>` 中
- 使用 `v-html` 渲染到 `<span>` 上，SVG 需設定 `width`、`height`、`viewBox` 屬性
- 樣式使用 `currentColor`（`stroke` 或 `fill`），讓 icon 顏色跟隨父元素文字色
- 只適用於 hardcoded、可信任的 SVG 字串，不可用於動態或使用者輸入的內容

```ts
const ticketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="..."/>
</svg>`
```

```pug
span(v-html='icon')
```

## Composables

- 放在 `src/composables/` 目錄下，以 `use` 開頭命名（e.g. `useFavorites.ts`）
- 需要跨元件共享的狀態，在模組層級（module-level）宣告 ref，函式內直接操作，所有呼叫端共享同一個實例

```ts
import { useLocalStorage } from '@vueuse/core'

// module-level singleton
const state = useLocalStorage<T>('storage-key', defaultValue)

export function useMyComposable() {
  // ...
  return { state }
}
```

## Route Query 同步模式

若 View 在 `setup` 時從 `route.query` 初始化 `ref`，且該 View 可能在已掛載狀態下被其他元件以 `router.push` 帶入新 query，需額外加反向 watcher，否則搜尋條件不會更新：

```ts
// 初始化（只執行一次）
const query = ref((route.query.q as string) ?? '')

// 反向同步：外部導航帶入新 q 時更新 ref
watch(
  () => route.query.q,
  q => {
    query.value = (q as string) ?? ''
  },
)
```

## 部署注意事項

- Vite `base` 目前設定為 `/2026-tre-helper/`
- Vue Router 目前使用 hash mode 部署到 GitHub Pages，網址格式為 `/2026-tre-helper/#/...`，不要直接改回 history mode，除非同步補上靜態 fallback 或改用支援 rewrite 的主機
- 若調整部署路徑、網域根目錄或靜態資源位置，請同步檢查 `vite.config.ts` 與相關連結設定
- 若調整路由策略，請同步檢查 `src/router/index.ts` 與 GitHub Pages 部署行為是否一致

## z-index 隔離

使用絕對定位且 z-index 值較大的元素（例如以時間分鐘數作為 z-index 的行事曆卡片），需在其容器加上 `isolate` class，將堆疊情境限制在容器內，避免蓋過頁面層級的 sticky header 或 navbar：

```pug
div(class='relative isolate ...')
  div(class='absolute ...', :style='{ zIndex: ... }')
```

## 行事曆密度

場次／舞台行事曆若使用絕對定位堆疊卡片，高度縮放不可只依固定一小時基準估算；需依同一欄位、同一 `startTime` 的最大卡片數，搭配該組實際時長計算所需密度，否則短時段多場次會互相擠壓。

- 縮放至少要考慮 `group size / duration`，避免 15 分鐘短場次沿用 60 分鐘密度
- 需允許提高 `px/min` 上限，確保同時段多張卡片仍可讀

## NEVER

- **不可在 Vue template / Pug 屬性字串中使用 TypeScript `!` 非空斷言**：`foo.bar!` 在 template 編譯後會產生 runtime `SyntaxError`。請改用 `v-if` guard 或 `?? fallback`
- **不可直接操作 `window.localStorage`**：請使用 VueUse 的 `useLocalStorage`
- **不可在 `overflow-x-auto` 容器上用 `flex justify-center` 置中**：內容超出容器時左側不可達，無法向左捲動。請改用 `w-max mx-auto` 在子元素上置中
