<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import type { Session, Artist, Event } from '@/types/index'
  import sessionsData from '@/data/sessions.json'
  import artistsData from '@/data/artists.json'
  import eventsData from '@/data/events.json'
  import StickySearchBar from '@/components/StickySearchBar.vue'

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

  const externalIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`

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

  function openModal(s: Session) {
    selectedSession.value = s
  }

  function closeModal() {
    selectedSession.value = null
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
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
                  @click='openModal(s)'
                  class='font-serif-tc mb-0.5 cursor-pointer rounded bg-zinc-700/70 px-1.5 py-0.5 leading-snug text-white/90 transition-colors duration-150 hover:bg-zinc-600/80'
                ) {{ artistNames(s) }}
    p(v-else class='text-center text-sm text-white/40') 找不到符合的場次

//- Modal
teleport(to='body')
  transition(
    enter-active-class='transition-opacity duration-[250ms] ease-in-out'
    leave-active-class='transition-opacity duration-[250ms] ease-in-out'
    enter-from-class='opacity-0'
    leave-to-class='opacity-0'
  )
    div(
      v-if='selectedSession'
      class='fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm'
      @click.self='closeModal'
    )
      div(class='w-full max-w-md rounded-lg border border-white/12 bg-zinc-900 p-8')
        div(class='mb-6 flex items-start justify-between gap-4')
          h2(class='font-serif-tc text-xl font-bold tracking-[0.2em] text-white') {{ artistNames(selectedSession) }}
          button(
            @click='closeModal'
            aria-label='關閉'
            class='mt-1 cursor-pointer border-none bg-transparent p-0 text-white/50 transition-colors duration-200 hover:text-white'
          )
            svg(
              xmlns='http://www.w3.org/2000/svg'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              stroke-width='2'
              stroke-linecap='round'
              stroke-linejoin='round'
            )
              path(d='M18 6 6 18')
              path(d='m6 6 12 12')
        div(class='flex flex-col gap-4')
          div
            p(class='mb-1 text-xs tracking-[0.15em] text-white/40') 場次名稱
            p(class='font-serif-tc text-sm leading-relaxed text-white/80') {{ selectedSession.title }}
          div
            p(class='mb-1 text-xs tracking-[0.15em] text-white/40') 活動
            a(
              :href='`https://jkface.net/events/${selectedSession.eventId}`'
              target='_blank'
              rel='noopener noreferrer'
              class='font-serif-tc inline-flex items-center gap-1.5 text-sm text-white no-underline transition-colors duration-200 hover:text-[#e8003a]'
            )
              span {{ eventNameMap.get(selectedSession.eventId) }}
              span(v-html='externalIcon')
          div
            p(class='mb-2 text-xs tracking-[0.15em] text-white/40') 女優
            ul(class='flex flex-col gap-1.5')
              li(
                v-for='artistId in selectedSession.artistIds',
                :key='artistId'
              )
                a(
                  :href='`https://jkface.net/profile/${artistId}`'
                  target='_blank'
                  rel='noopener noreferrer'
                  class='inline-flex items-center gap-1.5 text-sm text-white no-underline transition-colors duration-200 hover:text-[#e8003a]'
                )
                  span {{ artistMap.get(artistId) }}
                  span(v-html='externalIcon')
</template>
