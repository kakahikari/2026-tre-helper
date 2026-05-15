export interface Artist {
  id: number
  name: string
}

// 對應 JSON 原始資料結構
export interface Event {
  id: number
  name: string
  artistIds: number[]
}

export interface Booth {
  id: string
  name: string
  category: string
  artistIds: number[]
}

// 已解析關聯後的型別（artistIds 展開為完整 Artist 物件）
export interface ResolvedEvent extends Omit<Event, 'artistsIds'> {
  artists: Artist[]
}

export interface ResolvedBooth extends Omit<Booth, 'artistsIds'> {
  artists: Artist[]
}

// 活動場次（來源：GetReserveInfo API）
export interface Session {
  id: number // checkInGroupId
  eventId: number // 所屬活動 id
  title: string // reserveName（原始標題）
  time: string // 從標題解析出的時間，格式 "YYYY/MM/DD HH:mm"
  artistIds: number[] // 從標題解析出的藝人 id 列表
}

export interface ResolvedSession extends Omit<Session, 'artistIds'> {
  artists: Artist[]
}
