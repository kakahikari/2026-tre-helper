// 女優
export interface Artist {
  id: number
  name: string
}

// 活動
export interface Event {
  id: number
  name: string
  artistIds: number[]
}

// 攤位
export interface Booth {
  id: string
  name: string
  category: string
  artistIds: number[]
}

// 已解析關聯後的型別（artistIds 展開為完整 Artist 物件）
export interface ResolvedEvent extends Omit<Event, 'artistIds'> {
  artists: Artist[]
}

export interface ResolvedBooth extends Omit<Booth, 'artistIds'> {
  artists: Artist[]
}

// 主舞台時刻表
export interface Stage {
  id: number
  stage: string
  date: string
  startTime: string
  endTime: string
  activity: string
  artistIds: number[]
}

// 活動場次（來源：GetReserveInfo API）
export interface Session {
  id: number // checkInGroupId
  eventId: number // 所屬活動 id
  title: string // 場次名稱
  time: string // 從標題解析出的時間，格式 "YYYY/MM/DD HH:mm"
  artistIds: number[] // 從標題解析出的藝人 id 列表
}

export interface ResolvedSession extends Omit<Session, 'artistIds'> {
  artists: Artist[]
}
