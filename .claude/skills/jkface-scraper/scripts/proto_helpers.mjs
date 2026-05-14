/**
 * JKFace gRPC-Web protobuf helper utilities
 * 複製這些 helpers 到任何需要呼叫 JKFace API 的腳本中使用
 */

/** 讀取 protobuf varint，回傳 { val, pos }（pos 指向 varint 結束後的下一個位置） */
export function readVarint(buf, pos) {
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

/** 將數字編碼為 protobuf varint bytes array */
export function encodeVarint(n) {
  const b = []
  while (n > 0x7f) {
    b.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  b.push(n)
  return b
}

/**
 * 包裝 protobuf message bytes 為 gRPC-Web frame
 * Format: 0x00 (no compress) + 4-byte big-endian length + message bytes
 */
export function grpcFrame(msgBytes) {
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

/**
 * 在 response buffer 中搜尋特定 field tag（wire type 2 = LEN）
 * 的所有出現位置，並驗證其 packed varint 內容是否符合條件
 *
 * @param {Uint8Array} buf - 完整的 gRPC-Web response buffer
 * @param {number[]} tagBytes - field tag 的 bytes，e.g. [0x9a, 0x01] for field 19
 * @param {(val: number) => boolean} validator - 驗證每個 varint 是否有效
 * @param {number} minCount - 最少要有幾個有效值才算命中
 * @returns {number[] | null} - packed varint 值的陣列，或 null（未找到）
 */
export function findPackedField(buf, tagBytes, validator, minCount = 3) {
  const [t0, t1] = tagBytes
  for (let i = 5; i < buf.length - (tagBytes.length + 2); i++) {
    if (buf[i] !== t0) continue
    if (tagBytes.length > 1 && buf[i + 1] !== t1) continue

    const lr = readVarint(buf, i + tagBytes.length)
    const dataStart = lr.pos
    const dataEnd = dataStart + lr.val

    if (dataEnd > buf.length || lr.val < 2) continue

    const ids = []
    let pos = dataStart
    let valid = true
    while (pos < dataEnd) {
      const r = readVarint(buf, pos)
      if (!validator(r.val)) {
        valid = false
        break
      }
      ids.push(r.val)
      pos = r.pos
    }
    if (valid && ids.length >= minCount) return ids
  }
  return null
}

/** 從 LEN field 讀取 UTF-8 字串 */
export function readString(buf, pos) {
  const lr = readVarint(buf, pos)
  return {
    text: Buffer.from(buf.slice(lr.pos, lr.pos + lr.val)).toString('utf8'),
    pos: lr.pos + lr.val,
  }
}

/**
 * 通用的 protobuf message 解析器
 * 對 buf[startPos..endPos] 內的每個 field 呼叫 onField callback
 *
 * @param {Uint8Array} buf
 * @param {number} startPos
 * @param {number} endPos
 * @param {(fieldNum: number, wireType: number, pos: number, buf: Uint8Array) => number} onField
 *   - 接收 fieldNum, wireType, 目前 pos（指向 field value 的開頭）
 *   - 回傳讀完 field value 後的新 pos
 */
export function parseMessage(buf, startPos, endPos, onField) {
  let pos = startPos
  while (pos < endPos) {
    if (buf[pos] === 0x80) break // gRPC trailer frame
    const tr = readVarint(buf, pos)
    pos = tr.pos
    const wt = tr.val & 7,
      fn = tr.val >> 3
    pos = onField(fn, wt, pos, buf)
  }
}

/** 跳過一個 field value（用於不關心的欄位） */
export function skipField(wt, buf, pos) {
  if (wt === 0) {
    while (buf[pos++] & 0x80) {}
    return pos
  }
  if (wt === 2) {
    const lr = readVarint(buf, pos)
    return lr.pos + lr.val
  }
  if (wt === 5) return pos + 4
  if (wt === 1) return pos + 8
  throw new Error(`Unknown wire type: ${wt} at pos ${pos}`)
}

/** JKFace API headers（Node.js 環境） */
export const JKFACE_HEADERS = {
  'content-type': 'application/grpc-web+proto',
  'x-grpc-web': '1',
  origin: 'https://jkface.net',
  referer: 'https://jkface.net/',
}

/** 呼叫 JKFace gRPC-Web API */
export async function callJkfaceApi(method, msgBytes) {
  const resp = await fetch(
    `https://face-front-api.hare200.com/gapi/${method}`,
    { method: 'POST', headers: JKFACE_HEADERS, body: grpcFrame(msgBytes) },
  )
  return new Uint8Array(await resp.arrayBuffer())
}
