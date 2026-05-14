---
name: jkface-scraper
description: >
  Use this skill whenever you need to scrape or fetch data from JKFace (jkface.net)
  using its gRPC-Web API. Trigger this skill when the user:
  - Provides a JKFace API endpoint name (e.g. GetCollectionPageInfo, GetArtistList)
    and says what data to extract
  - Wants to update src/data/*.json files with data from jkface.net or
    face-front-api.hare200.com
  - Asks to scrape a new kind of data from the JKFace platform (artists, events,
    schedules, tickets, lineup info, etc.)
  - Mentions TRE展、TSE展、JKFace陣容 and wants to sync the local data files
  This skill covers the full workflow: API discovery via Chrome DevTools MCP →
  protobuf decoding → Node.js script writing → JSON update.
---

# JKFace gRPC-Web 爬蟲工作流程

## 平台特性

JKFace (jkface.net) 是一個 Vue 3 SPA，所有資料透過 **gRPC-Web** API 取得：

| 項目 | 值 |
|------|-----|
| API base | `https://face-front-api.hare200.com/gapi` |
| Content-Type | `application/grpc-web+proto` |
| 必要 headers | `x-grpc-web: 1`, `origin: https://jkface.net`, `referer: https://jkface.net/` |
| 格式 | 二進制 Protobuf，非 JSON |
| CORS | Server 有 CORS 設定，但 Node.js 直接呼叫不受瀏覽器 CORS 限制 |

## 工作流程

### 第一步：開啟頁面並攔截 API 請求

**永遠先用 Chrome DevTools MCP 攔截實際 binary**，不要靠猜測。

```javascript
// initScript: 在頁面載入前注入，攔截所有 fetch 呼叫
(function() {
  const orig = window.fetch;
  window.__captured = {};
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url && url.includes('TARGET_METHOD_NAME')) {
      const body = init?.body;
      if (body) {
        const arr = body instanceof Uint8Array
          ? body
          : new Uint8Array(await new Response(body).arrayBuffer());
        window.__captured.reqHex = Array.from(arr)
          .map(b => b.toString(16).padStart(2, '0')).join(' ');
      }
      const resp = await orig.apply(this, arguments);
      resp.clone().arrayBuffer().then(buf => {
        window.__captured.respHex = Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0')).join(' ');
      });
      return resp;
    }
    return orig.apply(this, arguments);
  };
})();
```

使用方式：
```javascript
// 1. 開啟頁面，initScript 注入攔截器
mcp__chrome-devtools__navigate_page({ type: 'url', url: PAGE_URL, initScript: '...' })

// 2. 等待頁面載入
mcp__chrome-devtools__wait_for({ text: ['已知會出現的文字'] })

// 3. 取得攔截到的 hex
mcp__chrome-devtools__evaluate_script({ function: '() => window.__captured' })
```

---

### 第二步：解碼 gRPC-Web Binary

#### Frame 格式
```
[0x00]              1 byte  : 壓縮 flag（通常為 0）
[len_bytes 4 bytes] 4 bytes : protobuf 訊息長度（big-endian）
[protobuf message]  N bytes : 實際 protobuf 內容
```

#### Protobuf Wire Types
| Wire Type | 值 | 說明 |
|---|---|---|
| varint | 0 | int32/int64/bool/enum，變長編碼 |
| 64-bit | 1 | fixed64，跳過 8 bytes |
| LEN | 2 | 字串/bytes/巢狀訊息，length prefix |
| 32-bit | 5 | fixed32，跳過 4 bytes |

**Field tag 解碼**：tag varint = `(field_number << 3) | wire_type`
- `0x08` → field 1, varint
- `0x12` → field 2, LEN
- `0x9a 0x01` → 154 = (19 << 3) | 2 = field 19, LEN

**Varint 解碼規則**：每個 byte 的最高位是 continuation bit；低 7 bits 是資料，LSB first。

#### 在頁面中快速解碼驗證

```javascript
// 在 evaluate_script 中直接解碼驗證
() => {
  function readVarint(buf, pos) {
    let val = 0, shift = 0
    while (true) {
      const b = buf[pos++]
      val |= (b & 0x7f) << shift
      shift += 7
      if (!(b & 0x80)) break
    }
    return { val, pos }
  }
  // 解析已知的 response hex...
}
```

---

### 第三步：找出目標欄位

**策略：搜尋模式而非固定 offset**

不要硬編碼位置（response 大小會隨資料變動），改用：

1. **搜尋已知 field tag**：掃描整個 buffer 找所有特定 tag（如 `9a 01` = field 19 LEN）
2. **驗證內容合理性**：確認解出的值在預期範圍（如 ID 介於 100–5000）
3. **多層嵌套**：JKFace response 經常多層包裹，field 19 可能在 field 18 裡面

```javascript
// 搜尋任何 field 19 (9a 01) 且內容為有效 ID 的 packed field
for (let i = 5; i < buf.length - 3; i++) {
  if (buf[i] !== 0x9a || buf[i + 1] !== 0x01) continue
  const lr = readVarint(buf, i + 2)
  const dataStart = lr.pos, dataEnd = dataStart + lr.val
  if (dataEnd > buf.length || lr.val < 4) continue
  const ids = []
  let pos = dataStart, valid = true
  while (pos < dataEnd) {
    const r = readVarint(buf, pos)
    if (r.val < 100 || r.val > 5000) { valid = false; break }
    ids.push(r.val); pos = r.pos
  }
  if (valid && ids.length >= 3) return ids  // 找到了
}
```

**常見欄位規律**（根據已知 API 推斷）：
- field 1: 內部 ID（varint）
- field 2: UUID 字串（LEN, 36 chars）
- field 6: 名稱文字（LEN, UTF-8）
- field 10: profile URL（LEN，如 `https://jkface.net/profile/5675902`）
- field 19: packed repeated IDs（LEN，內含多個 varint）

---

### 第四步：寫 Node.js 腳本

腳本放在 `scripts/` 目錄，命名如 `fetch-{resource}.mjs`。**不需要安裝任何 npm 套件**，Node.js 18+ 內建 fetch。

參考 [scripts/proto_helpers.mjs](scripts/proto_helpers.mjs) 取得完整的 helper 函式（`readVarint`, `encodeVarint`, `grpcFrame`）。

#### 腳本結構

```javascript
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '../src/data/TARGET.json')

const HEADERS = {
  'content-type': 'application/grpc-web+proto',
  'x-grpc-web': '1',
  'origin': 'https://jkface.net',
  'referer': 'https://jkface.net/',
}

// 1. 第一個 API 呼叫（取 IDs 或頁面資訊）
async function fetchXxx() {
  const msg = [0x08, ...encodeVarint(TARGET_ID)]  // {field1: TARGET_ID}
  const body = grpcFrame(msg)
  const resp = await fetch('https://face-front-api.hare200.com/gapi/face.v2.XxxService/GetXxx', {
    method: 'POST', headers: HEADERS, body,
  })
  return new Uint8Array(await resp.arrayBuffer())
}

// 2. 解析 response，提取目標資料
function parseResponse(buf) {
  const items = []
  let pos = 5  // 跳過 gRPC-Web frame header
  while (pos < buf.length && buf[pos] !== 0x80) {
    const tr = readVarint(buf, pos); pos = tr.pos
    const wt = tr.val & 7, fn = tr.val >> 3
    if (wt === 2) {
      const lr = readVarint(buf, pos); pos = lr.pos
      // 根據 fieldNum 提取資料
      if (fn === TARGET_FIELD) {
        items.push(Buffer.from(buf.slice(pos - lr.val, pos)).toString('utf8'))
      }
    } else if (wt === 0) { const r = readVarint(buf, pos); pos = r.pos }
    else if (wt === 5) pos += 4
    else if (wt === 1) pos += 8
    else break
  }
  return items
}

// 3. merge 更新 JSON（只新增，不覆蓋）
const raw = await fetchXxx()
const scraped = parseResponse(raw)
const existing = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
const existingIds = new Set(existing.map(a => a.id))
const newItems = scraped.filter(a => !existingIds.has(a.id))
if (newItems.length === 0) {
  console.log('No new data.')
} else {
  writeFileSync(DATA_FILE, JSON.stringify([...existing, ...newItems], null, 2) + '\n')
  console.log(`Added ${newItems.length} new items.`)
}
```

#### 加到 package.json

```json
"scripts": {
  "fetch-artists": "node scripts/fetch-artists.mjs"
}
```

---

### 第五步：驗證

```bash
node scripts/fetch-RESOURCE.mjs
# 確認輸出：Fetched N IDs, Got M items, Added X new items
```

確認後執行 `pnpm type-check` 確保 TypeScript 無誤。

---

## 常見問題

**Q: API 回傳空 response（0 bytes）**
→ Request body 格式錯誤。回到 Chrome DevTools 重新攔截確認 hex。

**Q: 找不到 field 19（或其他 field）**
→ 多層嵌套。用搜尋策略（掃描所有 `9a 01` 出現位置）而非固定 offset。

**Q: 從 Node.js 呼叫 API 被拒絕**
→ 確認 `origin` 和 `referer` headers 都有帶，這是 Server 端的 CORS 驗證。

**Q: varint 解碼出很大的數字**
→ 可能 buffer 位置不對，或者是巢狀 LEN field 的 length varint 被誤認為 data varint。

**Q: 不知道某個 field 的意思**
→ 在 Chrome DevTools evaluate_script 中直接印出所有 fieldNum 及其內容，對照頁面顯示的資料反推。

## 已知的 API Endpoints（2026 TRE）

| Method | 用途 | 已確認參數 |
|--------|------|-----------|
| `face.v2.ActivityService/GetCollectionPageInfo` | 取得 collection 頁面資訊（含所有 lineup IDs） | `{field1: 4}` = TRE 2026 |
| `face.v2.ActivityService/GetCollectionPageLineupInfo` | 取得指定 lineup items 的完整資料 | `{field1: 4, field2: [ids]}` |
