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
