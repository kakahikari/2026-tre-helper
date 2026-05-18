/**
 * 從 JKFace gRPC-Web API 抓取每個活動的場次資料，更新 src/data/sessions.json
 *
 * 流程：
 *   對 events.json 裡每個活動 ID 呼叫 GetReserveInfo(activityId)
 *   → 解析 checkInGroupId、reserveName
 *   → 從 reserveName 取出 time（開始時間）和藝人名列表
 *   → 查 artists.json 取得 artistIds
 *
 * 用法：node scripts/fetch-sessions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SESSIONS_FILE = join(__dirname, '../src/data/sessions.json')
const EVENTS_FILE = join(__dirname, '../src/data/events.json')
const ARTISTS_FILE = join(__dirname, '../src/data/artists.json')
const GAPI = 'https://face-front-api.hare200.com/gapi'

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

// ── 解析 reserveName → time + 藝人名列表 ────────────────────────────────────
//
// 已知 title 格式（依出現頻率）：
//   A: "YYYY/MM/DD HH:mm-HH:mm 藝人名"       → 標準格式（可能多餘空白）
//   B: "M/D HH:mm-HH:mm 【藝人名】說明"      → 短日期 + 括號藝人名
//   C: "M/D HH:mm-HH:mm 說明 藝人名"         → 短日期 + 藝人名在末尾
//   D: "YYYYMMDDHHmm說明 藝人名..."           → 無分隔符 12 位日期時間
//   E: "YYYYMMDD藝人名說明"                   → 無分隔符 8 位日期（無時間）
//   F: "MMDDHHmm藝人名說明"                   → 4 位日期 + HH:mm（含冒號）

// 日文字與繁體字對應，用於名稱比對正規化
const JP_TO_TRAD = { 桜: '櫻', 桧: '檜', 滝: '瀧', 竜: '龍' }
function normalize(s) {
  return s.replace(/[桜桧滝竜]/g, c => JP_TO_TRAD[c] ?? c)
}

function createArtistLookup(artists) {
  const nameToId = new Map(artists.map(artist => [artist.name, artist.id]))
  const normalizedNameToArtist = new Map(
    artists.map(artist => [normalize(artist.name), artist]),
  )

  return { nameToId, normalizedNameToArtist }
}

function resolveArtistName(name, artistLookup) {
  if (artistLookup.nameToId.has(name)) return name
  return artistLookup.normalizedNameToArtist.get(normalize(name))?.name ?? null
}

/** 從文字中找出已知藝人名（支援字元正規化） */
function extractArtistNames(text, artistLookup) {
  // 優先比對【...】括號內容
  const brackets = [...text.matchAll(/【([^】]+)】/g)].map(m => m[1].trim())
  const fromBrackets = [
    ...new Set(
      brackets
        .map(name => resolveArtistName(name, artistLookup))
        .filter(Boolean),
    ),
  ]
  if (fromBrackets.length > 0) return fromBrackets
  // 掃描所有已知藝人名
  return [...artistLookup.nameToId.keys()].filter(name =>
    normalize(text).includes(normalize(name)),
  )
}

function parseReserveName(title, artistLookup) {
  // A: 標準格式（YYYY/MM/DD，允許多餘空白）
  const fA = title.match(
    /^(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s+(.+)$/,
  )
  if (fA)
    return {
      date: fA[1],
      startTime: fA[2],
      endTime: fA[3],
      artistNames: extractArtistNames(fA[4], artistLookup),
    }

  // D: YYYYMMDDHHMM（12 位，無分隔符，不帶冒號）
  const fD = title.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})([^\d].*)$/)
  if (fD)
    return {
      date: `${fD[1]}/${fD[2]}/${fD[3]}`,
      startTime: `${fD[4]}:${fD[5]}`,
      endTime: '',
      artistNames: extractArtistNames(fD[6], artistLookup),
    }

  // E: YYYYMMDD（8 位，無時間）
  const fE = title.match(/^(\d{4})(\d{2})(\d{2})([^\d].*)$/)
  if (fE)
    return {
      date: `${fE[1]}/${fE[2]}/${fE[3]}`,
      startTime: '',
      endTime: '',
      artistNames: extractArtistNames(fE[4], artistLookup),
    }

  // G: YYYY/MM/DD（有斜線，無時間，e.g. "2026/07/03【LV.1 專屬女神拍】 西野繪美"）
  const fG = title.match(/^(\d{4}\/\d{2}\/\d{2})\s*(.+)$/)
  if (fG)
    return {
      date: fG[1],
      startTime: '',
      endTime: '',
      artistNames: extractArtistNames(fG[2], artistLookup),
    }

  // B/C: M/D HH:mm-HH:mm（短日期，日期與時間間允許無空格）
  const fBC = title.match(
    /^(\d{1,2})\/(\d{1,2})\s*(\d{2}:\d{2})-(\d{2}:\d{2})\s*(.+)$/,
  )
  if (fBC) {
    const mm = fBC[1].padStart(2, '0'),
      dd = fBC[2].padStart(2, '0')
    return {
      date: `2026/${mm}/${dd}`,
      startTime: fBC[3],
      endTime: fBC[4],
      artistNames: extractArtistNames(fBC[5], artistLookup),
    }
  }

  // F: MMDD + HH:mm（帶冒號）
  const fF = title.match(/^(\d{2})(\d{2})(\d{2}:\d{2})(.+)$/)
  if (fF)
    return {
      date: `2026/${fF[1]}/${fF[2]}`,
      startTime: fF[3],
      endTime: '',
      artistNames: extractArtistNames(fF[4], artistLookup),
    }

  return { date: '', startTime: '', endTime: '', artistNames: [] }
}

function normalizeStartTime(result) {
  return { ...result, startTime: result.startTime || '09:00' }
}

// ── GetReserveInfo → sessions ────────────────────────────────────────────────

async function fetchReserveInfo(activityId) {
  const body = grpcFrame([0x08, ...encodeVarint(activityId)])
  const resp = await fetch(`${GAPI}/face.v2.ActivityService/GetReserveInfo`, {
    method: 'POST',
    headers: HEADERS,
    body,
  })
  const buf = new Uint8Array(await resp.arrayBuffer())

  const sessions = []
  for (const f of parseMessage(buf.slice(5))) {
    if (f.fn !== 1 || f.wt !== 2) continue
    let id = 0,
      title = ''
    for (const sf of parseMessage(f.bytes)) {
      if (sf.fn === 1 && sf.wt === 0) id = sf.val
      if (sf.fn === 2 && sf.wt === 2)
        title = Buffer.from(sf.bytes).toString('utf8')
    }
    if (id && title) sessions.push({ id, title })
  }
  return sessions
}

// ── Main ─────────────────────────────────────────────────────────────────────

const events = JSON.parse(readFileSync(EVENTS_FILE, 'utf-8'))
const artists = JSON.parse(readFileSync(ARTISTS_FILE, 'utf-8'))
const artistLookup = createArtistLookup(artists)
// 後宮場次例外：eventId → 該活動所有 artistIds
const eventArtistMap = new Map(events.map(e => [e.id, e.artistIds ?? []]))

const allSessions = []
const unresolvedArtists = []
const unparsedSessions = []

for (const event of events) {
  const raw = await fetchReserveInfo(event.id)
  if (raw.length === 0) continue

  console.log(`Event ${event.id} "${event.name}": ${raw.length} sessions`)

  for (const { id, title } of raw) {
    const { date, startTime, endTime, artistNames } = normalizeStartTime(
      parseReserveName(title, artistLookup),
    )
    if (!date) {
      unparsedSessions.push({ id, eventId: event.id, title })
    }

    const artistIds = []
    for (const name of artistNames) {
      const resolvedName = resolveArtistName(name, artistLookup)
      const aid = resolvedName ? artistLookup.nameToId.get(resolvedName) : null
      if (aid != null) {
        artistIds.push(aid)
      } else {
        unresolvedArtists.push({
          eventId: event.id,
          eventName: event.name,
          id,
          title,
          name,
        })
      }
    }
    // 後宮場次：直接用活動下所有女優
    if (title.includes('後宮')) {
      const eventArtists = eventArtistMap.get(event.id) ?? []
      for (const aid of eventArtists) {
        if (!artistIds.includes(aid)) artistIds.push(aid)
      }
    }
    allSessions.push({
      id,
      eventId: event.id,
      title,
      date,
      startTime,
      endTime,
      artistIds,
    })
  }
}

if (unparsedSessions.length > 0 || unresolvedArtists.length > 0) {
  if (unparsedSessions.length > 0) {
    console.error(
      `⚠ ${unparsedSessions.length} 筆場次無法解析時間，已停止輸出：`,
    )
    unparsedSessions.slice(0, 10).forEach(session => {
      console.error(
        `  event ${session.eventId}, session ${session.id}: "${session.title}"`,
      )
    })
  }

  if (unresolvedArtists.length > 0) {
    console.error(
      `⚠ ${unresolvedArtists.length} 筆藝人名稱無法對應，已停止輸出：`,
    )
    unresolvedArtists.slice(0, 10).forEach(item => {
      console.error(
        `  event ${item.eventId} "${item.eventName}", session ${item.id}: 「${item.name}」 in "${item.title}"`,
      )
    })
  }

  process.exit(1)
}

writeFileSync(SESSIONS_FILE, stableStringify(allSessions) + '\n')
console.log(`\n寫入 sessions.json — ${allSessions.length} 筆場次`)
