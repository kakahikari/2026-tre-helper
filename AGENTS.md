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
```

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

## 部署注意事項

- Vite `base` 目前設定為 `/2026-tre-helper/`
- 若調整部署路徑、網域根目錄或靜態資源位置，請同步檢查 `vite.config.ts` 與相關連結設定
