/**
 * 從 JKFace gRPC-Web API 抓取 TRE 2026 活動資料，更新 src/data/events.json
 *
 * 流程：
 *   1. GetCollectionPageVendorInfo(collectionPageId=4) → 取得所有 activityIds
 *   2. GetActivityInfo(activityIds)                   → 取得每個活動的 id, name
 *   3. GetActivityLineup(activityId) per activity      → 取得每個活動的 artistIds
 *
 * 用法：node scripts/fetch-events.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EVENTS_FILE = join(__dirname, '../src/data/events.json')
const GAPI = 'https://face-front-api.hare200.com/gapi'
const COLLECTION_ID = 4

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

// ── Protobuf helpers ─────────────────────────────────────────────────────────

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

/** 通用 protobuf 訊息解析：回傳每個 field 的 { fn, wt, val | bytes } 陣列 */
function parseMessage(buf) {
  const fields = []
  let pos = 0
  while (pos < buf.length) {
    if (buf[pos] === 0x80) break
    const tr = readVarint(buf, pos)
    pos = tr.pos
    const wt = tr.val & 7
    const fn = tr.val >> 3
    if (wt === 0) {
      const r = readVarint(buf, pos)
      pos = r.pos
      fields.push({ fn, wt, val: r.val })
    } else if (wt === 2) {
      const lr = readVarint(buf, pos)
      pos = lr.pos
      fields.push({ fn, wt, bytes: buf.slice(pos, pos + lr.val) })
      pos += lr.val
    } else if (wt === 5) {
      pos += 4
    } else if (wt === 1) {
      pos += 8
    } else {
      break
    }
  }
  return fields
}

// ── Step 1: GetCollectionPageVendorInfo → activityIds ────────────────────────

async function fetchVendorActivityIds() {
  // request: { field1: COLLECTION_ID }
  const body = grpcFrame([0x08, ...encodeVarint(COLLECTION_ID)])
  const resp = await fetch(
    `${GAPI}/face.v2.ActivityService/GetCollectionPageVendorInfo`,
    { method: 'POST', headers: HEADERS, body },
  )
  const buf = new Uint8Array(await resp.arrayBuffer())

  const activityIds = new Set()
  // response: field 1 repeated = vendor items
  const outerFields = parseMessage(buf.slice(5)) // skip gRPC frame header
  for (const f of outerFields) {
    if (f.fn !== 1 || f.wt !== 2) continue
    // vendor item: field 8 = packed repeated activityIds
    for (const vf of parseMessage(f.bytes)) {
      if (vf.fn !== 8 || vf.wt !== 2) continue
      // decode packed varints
      let pos = 0
      while (pos < vf.bytes.length) {
        const r = readVarint(vf.bytes, pos)
        if (r.val > 0) activityIds.add(r.val)
        pos = r.pos
      }
    }
  }

  return [...activityIds].sort((a, b) => a - b)
}

// ── Step 2: GetActivityInfo → id, name ───────────────────────────────────────

async function fetchActivityInfo(activityIds) {
  // request: { field1: packed repeated activityIds }
  const idBytes = activityIds.flatMap(id => encodeVarint(id))
  const body = grpcFrame([0x0a, ...encodeVarint(idBytes.length), ...idBytes])
  const resp = await fetch(`${GAPI}/face.v2.ActivityService/GetActivityInfo`, {
    method: 'POST',
    headers: HEADERS,
    body,
  })
  const buf = new Uint8Array(await resp.arrayBuffer())

  const activities = []
  // response: field 1 repeated = activity items { field1: id, field2: name }
  for (const f of parseMessage(buf.slice(5))) {
    if (f.fn !== 1 || f.wt !== 2) continue
    let id = 0,
      name = ''
    for (const af of parseMessage(f.bytes)) {
      if (af.fn === 1 && af.wt === 0) id = af.val
      if (af.fn === 2 && af.wt === 2)
        name = Buffer.from(af.bytes).toString('utf8').trim()
    }
    if (id && name) activities.push({ id, name })
  }

  return activities
}

// ── Step 3: GetActivityLineup → artistIds ────────────────────────────────────

async function fetchActivityLineup(activityId) {
  // request: { field2: packed [activityId] }
  const idBytes = encodeVarint(activityId)
  const body = grpcFrame([0x12, ...encodeVarint(idBytes.length), ...idBytes])
  const resp = await fetch(
    `${GAPI}/face.v2.ActivityService/GetActivityLineup`,
    { method: 'POST', headers: HEADERS, body },
  )
  const buf = new Uint8Array(await resp.arrayBuffer())

  const artistIds = []
  const seenArtistIds = new Set()
  // response: field 2 = { field1: actId, field2: repeated lineupItems }
  for (const f of parseMessage(buf.slice(5))) {
    if (f.fn !== 2 || f.wt !== 2) continue
    for (const of_ of parseMessage(f.bytes)) {
      if (of_.fn !== 2 || of_.wt !== 2) continue
      // lineup item: field 10 = profileUrl → extract artistId
      for (const lf of parseMessage(of_.bytes)) {
        if (lf.fn !== 10 || lf.wt !== 2) continue
        const url = Buffer.from(lf.bytes).toString('utf8')
        const match = url.match(/\/profile\/(\d+)/)
        if (!match) continue

        const artistId = Number(match[1])
        if (!seenArtistIds.has(artistId)) {
          seenArtistIds.add(artistId)
          artistIds.push(artistId)
        }
      }
    }
  }

  return artistIds
}

// ── Main ─────────────────────────────────────────────────────────────────────

const activityIds = await fetchVendorActivityIds()
console.log(`Step 1: Found ${activityIds.length} activity IDs:`, activityIds)

if (activityIds.length === 0) {
  console.error(
    'No activity IDs found. Check GetCollectionPageVendorInfo response.',
  )
  process.exit(1)
}

const activities = await fetchActivityInfo(activityIds)
console.log(`Step 2: Got ${activities.length} activities from GetActivityInfo`)

if (activities.length === 0) {
  console.error('Fetched 0 activities. Refusing to overwrite events.json.')
  process.exit(1)
}

const result = []
for (const act of activities) {
  const artistIds = await fetchActivityLineup(act.id)
  result.push({ ...act, artistIds })
  console.log(`  Activity ${act.id} "${act.name}": ${artistIds.length} artists`)
}

const existing = JSON.parse(readFileSync(EVENTS_FILE, 'utf-8'))
const nextEvents = [...new Map(result.map(e => [e.id, e])).values()].sort(
  (a, b) => a.id - b.id,
)
const existingById = new Map(existing.map(e => [e.id, e]))
const nextIds = new Set(nextEvents.map(e => e.id))

const added = nextEvents.filter(e => !existingById.has(e.id))
const updated = nextEvents.filter(e => {
  const prev = existingById.get(e.id)
  return (
    prev &&
    (prev.name !== e.name ||
      JSON.stringify(prev.artistIds) !== JSON.stringify(e.artistIds))
  )
})
const removed = existing.filter(e => !nextIds.has(e.id))

writeFileSync(EVENTS_FILE, stableStringify(nextEvents) + '\n')
console.log(`\nStep 3: Synced events.json — ${nextEvents.length} total events`)
if (added.length > 0) console.log(`  Added ${added.length} events.`)
if (updated.length > 0) console.log(`  Updated ${updated.length} events.`)
if (removed.length > 0) console.log(`  Removed ${removed.length} events.`)
