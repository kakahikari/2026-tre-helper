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
  origin: 'https://jkface.net',
  referer: 'https://jkface.net/',
}

function stableStringify(obj) {
  return JSON.stringify(
    obj,
    (_, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).sort())
        : v,
    2,
  )
}

// ── protobuf helpers ────────────────────────────────────────────────────────

function encodeVarint(n) {
  const b = []
  while (n > 0x7f) {
    b.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  b.push(n)
  return b
}

function readVarint(buf, pos) {
  let val = 0,
    shift = 0
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
    (len >> 24) & 0xff,
    (len >> 16) & 0xff,
    (len >> 8) & 0xff,
    len & 0xff,
    ...msgBytes,
  ])
}

// ── Step 1: GetCollectionPageInfo → lineup IDs ──────────────────────────────

async function fetchLineupIds() {
  // request: { field1: COLLECTION_ID }
  const body = grpcFrame([0x08, ...encodeVarint(COLLECTION_ID)])
  const resp = await fetch(
    `${GAPI}/face.v2.ActivityService/GetCollectionPageInfo`,
    {
      method: 'POST',
      headers: HEADERS,
      body,
    },
  )
  const buf = new Uint8Array(await resp.arrayBuffer())

  // 在整個 response 中搜尋 field 17 (tag = 8a 01, wire type 2 = LEN)，
  // field 17 是完整的 2026 TRE lineup ID 列表（355–450 連續區段）。
  // 注意：field 19 (9a 01) 是不完整的子集，會漏掉部分女優（如 lineupId 428 仁美）。
  for (let i = 5; i < buf.length - 3; i++) {
    if (buf[i] !== 0x8a || buf[i + 1] !== 0x01) continue

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
      if (r.val < 100 || r.val > 5000) {
        valid = false
        break
      }
      ids.push(r.val)
      pos = r.pos
    }
    if (valid && ids.length >= 3) return ids
  }
  throw new Error(
    'Field 17 (lineup IDs) not found in GetCollectionPageInfo response',
  )
}

// ── Step 2: GetCollectionPageLineupInfo → artists ───────────────────────────

async function fetchArtists(lineupIds) {
  const idBytes = lineupIds.flatMap(id => encodeVarint(id))
  const f1 = [0x08, ...encodeVarint(COLLECTION_ID)]
  const f2 = [0x12, ...encodeVarint(idBytes.length), ...idBytes]
  const body = grpcFrame([...f1, ...f2])

  const resp = await fetch(
    `${GAPI}/face.v2.ActivityService/GetCollectionPageLineupInfo`,
    {
      method: 'POST',
      headers: HEADERS,
      body,
    },
  )
  const buf = new Uint8Array(await resp.arrayBuffer())

  // 解析 response：每個 field 1 = 一筆 lineup item
  const artists = []
  let pos = 5 // skip gRPC-Web frame header

  while (pos < buf.length) {
    if (buf[pos] === 0x80) break

    const tr = readVarint(buf, pos)
    pos = tr.pos
    const wireType = tr.val & 7
    const fieldNum = tr.val >> 3

    if (wireType === 2) {
      const lr = readVarint(buf, pos)
      pos = lr.pos
      const item = buf.slice(pos, pos + lr.val)
      pos += lr.val

      if (fieldNum === 1) {
        const artist = parseLineupItem(item)
        if (artist) artists.push(artist)
      }
    } else if (wireType === 0) {
      const r = readVarint(buf, pos)
      pos = r.pos
    } else break
  }
  return artists
}

function parseLineupItem(buf) {
  let name = '',
    profileUrl = ''
  let pos = 0
  while (pos < buf.length) {
    const tr = readVarint(buf, pos)
    pos = tr.pos
    const wireType = tr.val & 7
    const fieldNum = tr.val >> 3

    if (wireType === 0) {
      const r = readVarint(buf, pos)
      pos = r.pos
    } else if (wireType === 2) {
      const lr = readVarint(buf, pos)
      pos = lr.pos
      const text = Buffer.from(buf.slice(pos, pos + lr.val))
        .toString('utf8')
        .trim()
      pos += lr.val
      if (fieldNum === 6) name = text // 名稱
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

function dedupeArtists(items) {
  const byId = new Map()
  for (const item of items) byId.set(item.id, item)
  return [...byId.values()] // preserve API order
}

// ── Main ────────────────────────────────────────────────────────────────────

const lineupIds = await fetchLineupIds()
console.log(`Fetched ${lineupIds.length} lineup IDs`)

const scraped = await fetchArtists(lineupIds)
console.log(`Got ${scraped.length} artists from API`)

if (scraped.length === 0) {
  console.error('Fetched 0 artists. Refusing to overwrite artists.json.')
  process.exit(1)
}

const existing = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
const nextArtists = dedupeArtists(scraped)
const existingById = new Map(existing.map(a => [a.id, a]))
const nextIds = new Set(nextArtists.map(a => a.id))

const added = nextArtists.filter(a => !existingById.has(a.id))
const updated = nextArtists.filter(a => {
  const prev = existingById.get(a.id)
  return prev && prev.name !== a.name
})
const removed = existing.filter(a => !nextIds.has(a.id))

writeFileSync(DATA_FILE, stableStringify(nextArtists) + '\n')
console.log(`Synced artists.json — ${nextArtists.length} total artists`)
if (added.length > 0) console.log(`  Added ${added.length} artists.`)
if (updated.length > 0) console.log(`  Updated ${updated.length} artists.`)
if (removed.length > 0) console.log(`  Removed ${removed.length} artists.`)
