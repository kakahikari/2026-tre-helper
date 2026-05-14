/**
 * 從 JKFace gRPC-Web API 抓取 TRE 2026 陣容女優，更新 src/data/artists.json
 * 用法：node scripts/fetch-artists.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, '../src/data/artists.json')
const GAPI = 'https://face-front-api.hare200.com/gapi'
const COLLECTION_ID = 4 // 2026 TRE collection page ID

const HEADERS = {
  'content-type': 'application/grpc-web+proto',
  'x-grpc-web': '1',
  'origin': 'https://jkface.net',
  'referer': 'https://jkface.net/',
}

// ── protobuf helpers ────────────────────────────────────────────────────────

function encodeVarint(n) {
  const b = []
  while (n > 0x7f) { b.push((n & 0x7f) | 0x80); n >>>= 7 }
  b.push(n)
  return b
}

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

function grpcFrame(msgBytes) {
  const len = msgBytes.length
  return new Uint8Array([
    0x00,
    (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
    ...msgBytes,
  ])
}

// ── Step 1: GetCollectionPageInfo → lineup IDs ──────────────────────────────

async function fetchLineupIds() {
  // request: { field1: COLLECTION_ID }
  const body = grpcFrame([0x08, ...encodeVarint(COLLECTION_ID)])
  const resp = await fetch(`${GAPI}/face.v2.ActivityService/GetCollectionPageInfo`, {
    method: 'POST', headers: HEADERS, body,
  })
  const buf = new Uint8Array(await resp.arrayBuffer())

  // 在整個 response 中搜尋所有 field 19 (tag = 9a 01, wire type 2 = LEN)，
  // 找到內容全為合理 lineup ID（100–2000）的那個 packed repeated varint 欄位
  for (let i = 5; i < buf.length - 3; i++) {
    if (buf[i] !== 0x9a || buf[i + 1] !== 0x01) continue

    const lr = readVarint(buf, i + 2)
    const dataStart = lr.pos
    const dataEnd = dataStart + lr.val

    if (dataEnd > buf.length || lr.val < 4) continue

    // 嘗試把內容解碼為 packed varints，驗證是否全為有效 ID
    const ids = []
    let pos = dataStart
    let valid = true
    while (pos < dataEnd) {
      const r = readVarint(buf, pos)
      if (r.val < 100 || r.val > 5000) { valid = false; break }
      ids.push(r.val)
      pos = r.pos
    }
    if (valid && ids.length >= 3) return ids
  }
  throw new Error('Field 19 (lineup IDs) not found in GetCollectionPageInfo response')
}

// ── Step 2: GetCollectionPageLineupInfo → artists ───────────────────────────

async function fetchArtists(lineupIds) {
  const idBytes = lineupIds.flatMap(id => encodeVarint(id))
  const f1 = [0x08, ...encodeVarint(COLLECTION_ID)]
  const f2 = [0x12, ...encodeVarint(idBytes.length), ...idBytes]
  const body = grpcFrame([...f1, ...f2])

  const resp = await fetch(`${GAPI}/face.v2.ActivityService/GetCollectionPageLineupInfo`, {
    method: 'POST', headers: HEADERS, body,
  })
  const buf = new Uint8Array(await resp.arrayBuffer())

  // 解析 response：每個 field 1 = 一筆 lineup item
  const artists = []
  let pos = 5 // skip gRPC-Web frame header

  while (pos < buf.length) {
    if (buf[pos] === 0x80) break

    const tr = readVarint(buf, pos); pos = tr.pos
    const wireType = tr.val & 7
    const fieldNum = tr.val >> 3

    if (wireType === 2) {
      const lr = readVarint(buf, pos); pos = lr.pos
      const item = buf.slice(pos, pos + lr.val)
      pos += lr.val

      if (fieldNum === 1) {
        const artist = parseLineupItem(item)
        if (artist) artists.push(artist)
      }
    } else if (wireType === 0) {
      const r = readVarint(buf, pos); pos = r.pos
    } else break
  }
  return artists
}

function parseLineupItem(buf) {
  let name = '', profileUrl = ''
  let pos = 0
  while (pos < buf.length) {
    const tr = readVarint(buf, pos); pos = tr.pos
    const wireType = tr.val & 7
    const fieldNum = tr.val >> 3

    if (wireType === 0) {
      const r = readVarint(buf, pos); pos = r.pos
    } else if (wireType === 2) {
      const lr = readVarint(buf, pos); pos = lr.pos
      const text = Buffer.from(buf.slice(pos, pos + lr.val)).toString('utf8')
      pos += lr.val
      if (fieldNum === 6) name = text       // 名稱
      if (fieldNum === 10) profileUrl = text // profile URL
    } else if (wireType === 5) {
      pos += 4
    } else if (wireType === 1) {
      pos += 8
    } else break
  }

  if (!name) return null
  const match = profileUrl.match(/\/profile\/(\d+)$/)
  const id = match ? Number(match[1]) : 0
  return id ? { id, name } : null
}

// ── Main ────────────────────────────────────────────────────────────────────

const lineupIds = await fetchLineupIds()
console.log(`Fetched ${lineupIds.length} lineup IDs`)

const scraped = await fetchArtists(lineupIds)
console.log(`Got ${scraped.length} artists from API`)

const existing = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
const existingIds = new Set(existing.map(a => a.id))
const newItems = scraped.filter(a => !existingIds.has(a.id))

if (newItems.length === 0) {
  console.log('No new artists. artists.json is up to date.')
} else {
  const merged = [...existing, ...newItems]
  writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2) + '\n')
  console.log(`Added ${newItems.length} new artists:`)
  newItems.forEach(a => console.log(`  ${a.id}  ${a.name}`))
}
