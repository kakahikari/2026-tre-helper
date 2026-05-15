<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { Session, Artist, Event } from '@/types/index'
  import sessionsData from '@/data/sessions.json'
  import artistsData from '@/data/artists.json'
  import eventsData from '@/data/events.json'
  import StickySearchBar from '@/components/StickySearchBar.vue'
  import SessionModal from '@/components/SessionModal.vue'
  import { useSessionFavorites } from '@/composables/useSessionFavorites'

  const sessions = sessionsData as Session[]
  const artists = artistsData as Artist[]
  const events = eventsData as Event[]

  const artistMap = new Map<number, string>(artists.map(a => [a.id, a.name]))
  const eventNameMap = new Map<number, string>(events.map(e => [e.id, e.name]))

  const DAY_BUTTONS = [
    { date: '2026/07/03', label: '7/3（四）' },
    { date: '2026/07/04', label: '7/4（五）' },
    { date: '2026/07/05', label: '7/5（六）' },
  ]

  const activeDate = ref('2026/07/03')
  const query = ref('')
  const selectedSession = ref<Session | null>(null)
  const hoveredTime = ref<string | null>(null)
  const hoveredEid = ref<number | null>(null)

  const { isFavorite } = useSessionFavorites()

  // 僅含有效時間的場次，依選定日期篩選，再依搜尋字串篩選
  const filteredSessions = computed(() => {
    const base = sessions.filter(
      s => s.time.startsWith(activeDate.value) && s.time.length > 10,
    )
    const q = query.value.trim()
    if (!q) return base
    return base.filter(
      s =>
        s.artistIds.some(id => (artistMap.get(id) ?? '').includes(q)) ||
        (eventNameMap.get(s.eventId) ?? '').includes(q),
    )
  })

  // 依首次出現順序取得該日有效 eventId
  const activeEventIds = computed(() => {
    const ids: number[] = []
    const seen = new Set<number>()
    for (const s of filteredSessions.value) {
      if (!seen.has(s.eventId)) {
        seen.add(s.eventId)
        ids.push(s.eventId)
      }
    }
    return ids
  })

  // 排序後的時間段
  const timeSlots = computed(() => {
    const times = new Set<string>()
    for (const s of filteredSessions.value) times.add(s.time.slice(11))
    return [...times].sort()
  })

  // grid: time → eventId → Session[]
  const grid = computed(() => {
    const map = new Map<string, Map<number, Session[]>>()
    for (const s of filteredSessions.value) {
      const time = s.time.slice(11)
      if (!map.has(time)) map.set(time, new Map())
      const row = map.get(time)!
      if (!row.has(s.eventId)) row.set(s.eventId, [])
      row.get(s.eventId)!.push(s)
    }
    return map
  })

  function shortEventName(eventId: number): string {
    const name = eventNameMap.get(eventId) ?? String(eventId)
    const cleaned = name.replace(/^2026\s*(?:TRE\s*)?/i, '')
    return cleaned.length > 12 ? cleaned.slice(0, 12) + '…' : cleaned
  }

  function artistNames(s: Session): string {
    return s.artistIds.map(id => artistMap.get(id) ?? '').join('、')
  }

  // 根據列（time）與欄（eid）的 hover 狀態決定儲存格背景
  function cellBg(time: string, eid: number): string {
    const row = hoveredTime.value === time
    const col = hoveredEid.value === eid
    if (row && col) return 'bg-white/10'
    if (row || col) return 'bg-white/5'
    return ''
  }

  function clearHover() {
    hoveredTime.value = null
    hoveredEid.value = null
  }

  function sessionCardClass(s: Session): string {
    return isFavorite(s.id)
      ? 'bg-amber-900/70 hover:bg-amber-800/80'
      : 'bg-zinc-700/70 hover:bg-zinc-600/80'
  }
</script>

<template lang="pug">
div(class='min-h-screen')
  //- 標題（可隨頁面捲動）
  div(class='px-6 pt-12 pb-4')
    h1(
      class='font-serif-tc text-center text-2xl font-bold tracking-[0.3em] text-white'
    ) 場次列表
  //- 凍結區塊：搜尋框 + 日期切換
  StickySearchBar(v-model='query' placeholder='輸入女優或活動名稱…')
    div(class='flex flex-wrap gap-2')
      button(
        v-for='btn in DAY_BUTTONS',
        :key='btn.date'
        @click='activeDate = btn.date',
        :class='activeDate === btn.date ? "border-white/60 text-white" : "border-white/12 text-white/50 hover:border-white/30 hover:text-white/80"'
        class='font-serif-tc cursor-pointer rounded-lg border bg-transparent px-4 py-2 text-sm tracking-wide transition-colors duration-200'
      ) {{ btn.label }}
  //- 格線
  div(class='px-6 pt-4 pb-12')
    div(
      v-if='filteredSessions.length'
      class='overflow-x-auto rounded-lg border border-white/8'
    )
      table(class='min-w-max border-collapse text-xs' @mouseleave='clearHover')
        thead
          tr
            th(
              class='sticky left-0 z-20 w-16 border-r border-b border-white/8 bg-zinc-950 px-3 py-2 text-center text-xs font-normal text-white/40'
            ) 時間
            th(
              v-for='eid in activeEventIds',
              :key='eid',
              :title='eventNameMap.get(eid)'
              class='w-28 border-r border-b border-white/8 px-2 py-2 text-center text-xs leading-snug font-normal transition-colors duration-150',
              :class='hoveredEid === eid ? "bg-zinc-800 text-white/90" : "bg-zinc-950 text-white/60"'
              @mouseenter='hoveredEid = eid'
              @mouseleave='hoveredEid = null'
            ) {{ shortEventName(eid) }}
        tbody
          tr(
            v-for='time in timeSlots',
            :key='time'
            @mouseenter='hoveredTime = time'
            @mouseleave='hoveredTime = null'
          )
            td(
              class='sticky left-0 z-10 border-r border-b border-white/6 px-3 py-1.5 text-center font-mono text-white/50 transition-colors duration-150',
              :class='hoveredTime === time ? "bg-zinc-800" : "bg-zinc-950"'
            ) {{ time }}
            td(
              v-for='eid in activeEventIds',
              :key='eid'
              class='border-r border-b border-white/6 px-1.5 py-1 align-top transition-colors duration-150',
              :class='cellBg(time, eid)'
              @mouseenter='hoveredEid = eid'
              @mouseleave='hoveredEid = null'
            )
              template(v-if='grid.get(time)?.get(eid)')
                div(
                  v-for='s in grid.get(time)?.get(eid)',
                  :key='s.id'
                  @click='selectedSession = s'
                  class='font-serif-tc mb-0.5 cursor-pointer rounded px-1.5 py-0.5 leading-snug text-white/90 transition-colors duration-150',
                  :class='sessionCardClass(s)'
                ) {{ artistNames(s) }}
    p(v-else class='text-center text-sm text-white/40') 找不到符合的場次

SessionModal(:session='selectedSession' @close='selectedSession = null')
</template>
