<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { onClickOutside } from '@vueuse/core'
  import type { Session, Artist, Event, Stage } from '@/types/index'
  import sessionsData from '@/data/sessions.json'
  import artistsData from '@/data/artists.json'
  import eventsData from '@/data/events.json'
  import stagesData from '@/data/stages.json'
  import StickySearchBar from '@/components/StickySearchBar.vue'
  import SessionModal from '@/components/SessionModal.vue'
  import StageModal from '@/components/StageModal.vue'
  import { useSessionFavorites } from '@/composables/useSessionFavorites'
  import { useStagesFavorites } from '@/composables/useStagesFavorites'
  import { useFavorites } from '@/composables/useFavorites'
  import { useRoute, useRouter } from 'vue-router'

  const sessions = sessionsData as Session[]
  const artists = artistsData as Artist[]
  const events = eventsData as Event[]
  const stages = stagesData as Stage[]

  const route = useRoute()
  const router = useRouter()

  const artistMap = new Map<number, string>(artists.map(a => [a.id, a.name]))
  const eventNameMap = new Map<number, string>(events.map(e => [e.id, e.name]))

  const VIEW_MODES = [
    { value: 'all' as const, label: '全部' },
    { value: 'stage' as const, label: '只看舞台' },
    { value: 'session' as const, label: '只看場次' },
  ]
  type ViewMode = 'all' | 'stage' | 'session'
  const validViewModes: ViewMode[] = ['all', 'stage', 'session']

  const MY_FILTERS = [
    { value: 'none' as const, label: '無' },
    { value: 'artist' as const, label: '收藏女優' },
    { value: 'schedule' as const, label: '我的行程' },
  ]
  type MyFilter = 'none' | 'artist' | 'schedule'
  const validMyFilters: MyFilter[] = ['none', 'artist', 'schedule']

  const DAY_BUTTONS = [
    { date: '2026/07/03', label: '7/3（五）' },
    { date: '2026/07/04', label: '7/4（六）' },
    { date: '2026/07/05', label: '7/5（日）' },
  ]

  const validDates = DAY_BUTTONS.map(b => b.date)
  const activeDate = ref(
    validDates.includes(route.query.date as string)
      ? (route.query.date as string)
      : '2026/07/03',
  )
  const query = ref((route.query.q as string) ?? '')
  const selectedSession = ref<Session | null>(null)
  const hoveredEid = ref<number | null>(null)
  const hoveredStageName = ref<string | null>(null)
  const myFilter = ref<MyFilter>(
    validMyFilters.includes(route.query.mf as MyFilter)
      ? (route.query.mf as MyFilter)
      : 'none',
  )
  const viewMode = ref<ViewMode>(
    validViewModes.includes(route.query.view as ViewMode)
      ? (route.query.view as ViewMode)
      : 'all',
  )

  const showStages = computed(() => viewMode.value !== 'session')
  const showSessions = computed(() => viewMode.value !== 'stage')

  const viewModeOpen = ref(false)
  const viewModeRef = ref<HTMLElement | null>(null)
  onClickOutside(viewModeRef, () => {
    viewModeOpen.value = false
  })

  const myFilterOpen = ref(false)
  const myFilterRef = ref<HTMLElement | null>(null)
  onClickOutside(myFilterRef, () => {
    myFilterOpen.value = false
  })

  const { isFavorite } = useSessionFavorites()
  const { isFavorite: isStageFavorite } = useStagesFavorites()
  const { isFavorite: isArtistFavorite } = useFavorites()

  const selectedStage = ref<Stage | null>(null)

  const filteredStages = computed(() => {
    const base = stages.filter(s => s.date === activeDate.value)
    const afterMy =
      myFilter.value === 'schedule'
        ? base.filter(s => isStageFavorite(s.id))
        : myFilter.value === 'artist'
          ? base.filter(s => s.artistIds.some(id => isArtistFavorite(id)))
          : base
    const q = query.value.trim()
    if (!q) return afterMy
    return afterMy.filter(
      s =>
        s.title.includes(q) ||
        s.stage.includes(q) ||
        s.artistIds.some(id => (artistMap.get(id) ?? '').includes(q)),
    )
  })

  const activeStageNames = computed(() => {
    const names: string[] = []
    const seen = new Set<string>()
    for (const s of filteredStages.value) {
      if (!seen.has(s.stage)) {
        seen.add(s.stage)
        names.push(s.stage)
      }
    }
    return names
  })

  const filteredSessions = computed(() => {
    const base = sessions.filter(
      s => s.date === activeDate.value && s.startTime !== '',
    )
    const afterMy =
      myFilter.value === 'schedule'
        ? base.filter(s => isFavorite(s.id))
        : myFilter.value === 'artist'
          ? base.filter(s => s.artistIds.some(id => isArtistFavorite(id)))
          : base
    const q = query.value.trim()
    if (!q) return afterMy
    return afterMy.filter(
      s =>
        s.artistIds.some(id => (artistMap.get(id) ?? '').includes(q)) ||
        (eventNameMap.get(s.eventId) ?? '').includes(q),
    )
  })

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

  const hasContent = computed(() => {
    if (showSessions.value && filteredSessions.value.length > 0) return true
    if (showStages.value && filteredStages.value.length > 0) return true
    return false
  })

  // 行事曆版型常數
  const HOUR_START = 9
  const HOUR_END = 18
  const MAX_PX_PER_MIN = 12
  const DAY_START_MIN = HOUR_START * 60
  const MIN_CARD_HEIGHT = 28
  const BASE_COL_PX = 96 // 每個 lane 的基準寬度（px），欄位寬 = maxConcurrent × BASE_COL_PX

  function durationMin(startTime: string, endTime: string): number {
    const start = timeToMin(startTime)
    const end = timeToMin(endTime)
    if (isNaN(start) || isNaN(end) || end <= start) return 15
    return end - start
  }

  function requiredPxPerMin<T>(
    items: T[],
    groupKey: (item: T) => string,
    getStartTime: (item: T) => string,
    getEndTime: (item: T) => string,
  ): number {
    if (items.length === 0) return 2

    const groups = new Map<string, T[]>()
    for (const item of items) {
      const key = `${groupKey(item)}:${getStartTime(item)}`
      const group = groups.get(key) ?? []
      group.push(item)
      groups.set(key, group)
    }

    let required = 2
    for (const group of groups.values()) {
      const maxDuration = Math.max(
        ...group.map(item => durationMin(getStartTime(item), getEndTime(item))),
      )
      required = Math.max(
        required,
        (group.length * MIN_CARD_HEIGHT) / maxDuration,
      )
    }
    return required
  }

  // 依目前顯示的同時段最大堆疊數與時長動態調整，短時段多卡片時需額外放大
  const pxPerMin = computed(() => {
    let required = 2
    if (showSessions.value) {
      required = Math.max(
        required,
        requiredPxPerMin(
          filteredSessions.value,
          s => String(s.eventId),
          s => s.startTime,
          s => s.endTime,
        ),
      )
    }
    if (showStages.value) {
      required = Math.max(
        required,
        requiredPxPerMin(
          filteredStages.value,
          s => s.stage,
          s => s.startTime,
          s => s.endTime,
        ),
      )
    }
    return Math.min(MAX_PX_PER_MIN, required)
  })

  const totalHeight = computed(
    () => (HOUR_END - HOUR_START) * 60 * pxPerMin.value,
  )
  const hourMarks = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i,
  )

  function timeToMin(t: string): number {
    if (!t) return NaN
    const parts = t.split(':').map(Number)
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  }

  function topPx(startTime: string): number {
    return (timeToMin(startTime) - DAY_START_MIN) * pxPerMin.value
  }

  function topPxFromHour(hour: number): number {
    return (hour * 60 - DAY_START_MIN) * pxPerMin.value
  }

  interface WithLayout {
    lane: number
    numLanes: number
    stackIndex: number
    stackSize: number
    stepH: number // 定位步進（自然均分，保證不溢出下一時段）
    cardH: number // 渲染高度（至少 MIN_CARD_HEIGHT，確保文字可讀）
  }

  // 同時段場次垂直堆疊，不同時段有重疊時才水平分欄
  // numLanes 依每個場次實際的最大同時併發數計算，不影響其他時段
  function layoutSessions<T extends { startTime: string; endTime: string }>(
    items: T[],
  ): (T & WithLayout)[] {
    if (items.length === 0) return []

    // 依 startTime 分組（同時段一起堆疊）
    const groups = new Map<string, T[]>()
    for (const item of items) {
      const g = groups.get(item.startTime) ?? []
      g.push(item)
      groups.set(item.startTime, g)
    }

    // 各組代表的時間資料（endTime 為空時給予最小高度對應的虛擬結束時間）
    const virtualEnd = (startTime: string, endTime: string) => {
      const raw = timeToMin(endTime)
      return isNaN(raw)
        ? timeToMin(startTime) + MIN_CARD_HEIGHT / pxPerMin.value
        : raw
    }
    const reps = [...groups.values()].map(g => g[0]!)
    const repData = reps.map((item, idx) => ({
      idx,
      start: timeToMin(item.startTime),
      end: virtualEnd(item.startTime, item.endTime),
    }))

    // 貪婪 lane 分配（跨組的時間重疊才水平分欄）
    const sorted = [...repData].sort((a, b) => a.start - b.start)
    const laneEnds: number[] = []
    const laneOf = new Map<number, number>()
    for (const { idx, start, end } of sorted) {
      let lane = laneEnds.findIndex(e => e <= start)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(0)
      }
      laneEnds[lane] = end
      laneOf.set(idx, lane)
    }

    // 每個代表的 numLanes = 其存在期間的最大同時併發數
    const numLanesOf = new Map<number, number>()
    for (const r of repData) {
      const checkPoints = new Set<number>([r.start])
      for (const other of repData) {
        if (other.start > r.start && other.start < r.end)
          checkPoints.add(other.start)
      }
      let maxCount = 0
      for (const t of checkPoints) {
        const count = repData.filter(o => o.start <= t && o.end > t).length
        maxCount = Math.max(maxCount, count)
      }
      numLanesOf.set(r.idx, maxCount)
    }

    // 展開：同組各 item 依結束時間升冪排（結束早→上，結束晚→下），再附上 layout 資訊
    // cardH 以組為單位均分，避免 MIN_CARD_HEIGHT 膨脹後溢出到下一時段
    const result: (T & WithLayout)[] = []
    let groupIdx = 0
    for (const group of groups.values()) {
      const lane = laneOf.get(groupIdx) ?? 0
      const numLanes = numLanesOf.get(groupIdx) ?? 1
      const sorted = [...group].sort((a, b) => {
        const ea = isNaN(timeToMin(a.endTime)) ? Infinity : timeToMin(a.endTime)
        const eb = isNaN(timeToMin(b.endTime)) ? Infinity : timeToMin(b.endTime)
        return ea - eb
      })
      const stackSize = sorted.length
      const startMin = timeToMin(sorted[0]!.startTime)
      const maxEndMin = Math.max(
        ...sorted.map(item => virtualEnd(item.startTime, item.endTime)),
      )
      const naturalH = (maxEndMin - startMin) * pxPerMin.value
      // 全部無 endTime 時，允許整疊往下展開至 stackSize × MIN_CARD_HEIGHT
      const allNoEnd = sorted.every(item => !item.endTime)
      const groupFullH = allNoEnd
        ? Math.max(naturalH, stackSize * MIN_CARD_HEIGHT)
        : naturalH
      // stepH：定位步進，均分不超出時段；cardH：渲染高度，保證文字可讀
      const stepH =
        stackSize > 1
          ? groupFullH / stackSize
          : Math.max(groupFullH, MIN_CARD_HEIGHT)
      const cardH = stackSize > 1 ? Math.max(stepH, MIN_CARD_HEIGHT) : stepH
      sorted.forEach((item, stackIndex) => {
        result.push({
          ...item,
          lane,
          numLanes,
          stackIndex,
          stackSize,
          stepH,
          cardH,
        })
      })
      groupIdx++
    }
    return result
  }

  // 每張卡片寬度固定為 BASE_COL_PX，left 以 px 絕對定位；欄位本身依最大併發數展寬
  function cardStyle(s: {
    startTime: string
    lane: number
    stackIndex: number
    stepH: number
    cardH: number
  }): Record<string, string> {
    const baseTop = topPx(s.startTime)
    return {
      top: `${baseTop + s.stackIndex * s.stepH}px`,
      height: `${s.cardH - 2}px`, // 2px 視覺間隔
      width: `${BASE_COL_PX}px`,
      left: `${s.lane * BASE_COL_PX}px`,
      zIndex: String(timeToMin(s.startTime) + s.stackIndex),
    }
  }

  const stageItemsWithLanesCache = computed(() => {
    const cache = new Map<string, (Stage & WithLayout)[]>()
    for (const stageName of activeStageNames.value) {
      cache.set(
        stageName,
        layoutSessions(filteredStages.value.filter(s => s.stage === stageName)),
      )
    }
    return cache
  })

  function stageItemsWithLanes(stageName: string): (Stage & WithLayout)[] {
    return stageItemsWithLanesCache.value.get(stageName) ?? []
  }

  // 欄位寬 = 該欄最大同時併發數 × BASE_COL_PX
  function stageColWidth(stageName: string): number {
    const items = stageItemsWithLanesCache.value.get(stageName) ?? []
    return Math.max(1, ...items.map(s => s.numLanes)) * BASE_COL_PX
  }

  const sessionItemsWithLanesCache = computed(() => {
    const cache = new Map<number, (Session & WithLayout)[]>()
    for (const eid of activeEventIds.value) {
      cache.set(
        eid,
        layoutSessions(filteredSessions.value.filter(s => s.eventId === eid)),
      )
    }
    return cache
  })

  function sessionItemsWithLanes(eid: number): (Session & WithLayout)[] {
    return sessionItemsWithLanesCache.value.get(eid) ?? []
  }

  function sessionColWidth(eid: number): number {
    const items = sessionItemsWithLanesCache.value.get(eid) ?? []
    return Math.max(1, ...items.map(s => s.numLanes)) * BASE_COL_PX
  }

  function shortEventName(eventId: number): string {
    const name = eventNameMap.get(eventId) ?? String(eventId)
    return name.replace(/^2026\s*(?:TRE\s*)?/i, '')
  }

  function artistNames(s: Session): string {
    return s.artistIds.map(id => artistMap.get(id) ?? '').join('、')
  }

  function sessionCardClass(s: Session): string {
    return isFavorite(s.id)
      ? 'bg-accent/25 hover:bg-accent/40'
      : 'bg-zinc-700/70 hover:bg-zinc-600/80'
  }

  const STAGE_THEME_DEFAULT = {
    header: 'bg-green-950/60 text-green-400/70',
    headerActive: 'bg-green-950 text-green-300',
    cell: 'bg-green-950/30',
    cellActive: 'bg-green-950/60',
    card: 'bg-green-800/40 hover:bg-green-700/50 text-green-200/90',
  }

  const STAGE_THEME: Record<string, typeof STAGE_THEME_DEFAULT> = {
    主舞台: {
      header: 'bg-sky-950/60 text-sky-400/70',
      headerActive: 'bg-sky-950 text-sky-300',
      cell: 'bg-sky-950/30',
      cellActive: 'bg-sky-950/60',
      card: 'bg-sky-800/40 hover:bg-sky-700/50 text-sky-200/90',
    },
    'AV+ VIP舞台': STAGE_THEME_DEFAULT,
  }

  function stageTheme(stageName: string): typeof STAGE_THEME_DEFAULT {
    return STAGE_THEME[stageName] ?? STAGE_THEME_DEFAULT
  }

  function stageHeaderClass(stageName: string): string {
    const t = stageTheme(stageName)
    return hoveredStageName.value === stageName ? t.headerActive : t.header
  }

  function stageCardClass(s: Stage): string {
    if (isStageFavorite(s.id))
      return 'bg-accent/25 hover:bg-accent/40 text-white/90'
    return stageTheme(s.stage).card
  }

  function stageCardLabel(s: Stage): string {
    if (s.artistIds.length) {
      return s.artistIds
        .map(id => artistMap.get(id) ?? '')
        .filter(Boolean)
        .join('、')
    }
    return s.title
  }

  function selectViewMode(value: ViewMode) {
    viewMode.value = value
    viewModeOpen.value = false
  }

  function selectMyFilter(value: MyFilter) {
    myFilter.value = value
    myFilterOpen.value = false
  }

  watch([activeDate, query, myFilter, viewMode], ([date, q, mf, view]) => {
    router.replace({
      query: {
        date,
        ...(q ? { q } : {}),
        ...(mf !== 'none' ? { mf } : {}),
        ...(view !== 'all' ? { view } : {}),
      },
    })
  })

  watch(
    () => [route.query.date, route.query.q, route.query.mf, route.query.view],
    ([date, q, mf, view]) => {
      activeDate.value = validDates.includes(date as string)
        ? (date as string)
        : '2026/07/03'
      query.value = (q as string) ?? ''
      myFilter.value = validMyFilters.includes(mf as MyFilter)
        ? (mf as MyFilter)
        : 'none'
      viewMode.value = validViewModes.includes(view as ViewMode)
        ? (view as ViewMode)
        : 'all'
    },
  )
</script>

<template lang="pug">
div(class='min-h-screen')
  //- 標題（可隨頁面捲動）
  div(class='px-4 pt-6 pb-3 sm:px-6 sm:pt-12 sm:pb-4')
    h1(
      class='font-serif-tc text-center text-xl font-bold tracking-[0.3em] text-white sm:text-2xl'
    ) 場次與舞台列表
  //- 凍結區塊：搜尋框 + 日期切換
  StickySearchBar(v-model='query' placeholder='輸入女優或活動名稱…')
    div(class='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3')
      div(class='flex flex-1 gap-2')
        button(
          v-for='btn in DAY_BUTTONS',
          :key='btn.date'
          @click='activeDate = btn.date',
          :class='activeDate === btn.date ? "border-white/60 text-white" : "border-white/12 text-white/50 hover:border-white/30 hover:text-white/80"'
          class='font-serif-tc flex-1 cursor-pointer rounded-lg border bg-transparent px-4 py-2 text-center text-sm tracking-wide transition-colors duration-200'
        ) {{ btn.label }}
      div(class='flex items-center justify-between gap-3')
        div(class='flex items-center gap-1 sm:gap-2')
          span(
            class='font-serif-tc shrink-0 text-xs tracking-wide text-white/40 sm:text-sm'
          ) 舞台/場次篩選
          div(ref='viewModeRef' class='relative')
            button(
              @click='viewModeOpen = !viewModeOpen'
              class='font-serif-tc flex w-23 cursor-pointer items-center justify-between gap-1 rounded-lg border border-white/20 bg-zinc-900 px-2 py-1.5 text-xs tracking-wide text-white/80 transition-colors duration-200 hover:border-white/40 sm:w-30 sm:gap-1.5 sm:px-3 sm:text-sm'
            )
              span {{ VIEW_MODES.find(m => m.value === viewMode)?.label }}
              svg(
                xmlns='http://www.w3.org/2000/svg'
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round',
                :class='viewModeOpen ? "rotate-180" : ""'
                class='transition-transform duration-200'
              )
                path(d='m6 9 6 6 6-6')
            div(
              v-if='viewModeOpen'
              class='absolute top-full left-0 z-30 mt-1 min-w-full overflow-hidden rounded-lg border border-white/12 bg-zinc-900 shadow-lg'
            )
              button(
                v-for='m in VIEW_MODES',
                :key='m.value'
                @click='selectViewMode(m.value)'
                class='font-serif-tc block w-full cursor-pointer px-4 py-2 text-left text-sm tracking-wide transition-colors duration-150 hover:bg-white/8',
                :class='viewMode === m.value ? "text-white" : "text-white/60"'
              ) {{ m.label }}
        div(class='flex items-center gap-1 sm:gap-2')
          span(
            class='font-serif-tc shrink-0 text-xs tracking-wide text-white/40 sm:text-sm'
          ) 我的篩選
          div(ref='myFilterRef' class='relative')
            button(
              @click='myFilterOpen = !myFilterOpen'
              class='font-serif-tc flex w-23 cursor-pointer items-center justify-between gap-1 rounded-lg border border-white/20 bg-zinc-900 px-2 py-1.5 text-xs tracking-wide text-white/80 transition-colors duration-200 hover:border-white/40 sm:w-30 sm:gap-1.5 sm:px-3 sm:text-sm'
            )
              span {{ MY_FILTERS.find(m => m.value === myFilter)?.label }}
              svg(
                xmlns='http://www.w3.org/2000/svg'
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round',
                :class='myFilterOpen ? "rotate-180" : ""'
                class='transition-transform duration-200'
              )
                path(d='m6 9 6 6 6-6')
            div(
              v-if='myFilterOpen'
              class='absolute top-full right-0 z-30 mt-1 min-w-full overflow-hidden rounded-lg border border-white/12 bg-zinc-900 shadow-lg'
            )
              button(
                v-for='m in MY_FILTERS',
                :key='m.value'
                @click='selectMyFilter(m.value)'
                class='font-serif-tc block w-full cursor-pointer px-4 py-2 text-left text-sm tracking-wide transition-colors duration-150 hover:bg-white/8',
                :class='myFilter === m.value ? "text-white" : "text-white/60"'
              ) {{ m.label }}
  //- 行事曆
  div(class='px-2 pt-2 pb-8 sm:px-6 sm:pt-4 sm:pb-12')
    p(v-if='!hasContent' class='py-8 text-center text-sm text-white/40') 找不到符合的場次
    div(v-else class='overflow-x-auto rounded-lg border border-white/8')
      div(class='mx-auto w-max')
        div(class='flex')
          //- 時間軸（水平 sticky）
          div(class='sticky left-0 z-20 w-10 shrink-0 bg-zinc-950 sm:w-14')
            div(
              class='flex h-16 items-center justify-center border-r border-b border-white/8'
            )
              span(class='text-xs text-white/30') 時間
            div(
              class='relative border-r border-white/8',
              :style='{ height: totalHeight + "px" }'
            )
              template(v-for='hour in hourMarks', :key='hour')
                div(
                  class='absolute inset-x-0 border-t border-white/6',
                  :style='{ top: topPxFromHour(hour) + "px" }'
                )
                  span(
                    class='block pt-0.5 pl-1 font-mono text-[10px] text-white/40 select-none sm:text-xs'
                  ) {{ String(hour).padStart(2, '0') }}:00
          //- 各欄位
          div(class='flex')
            //- 舞台欄
            template(v-if='showStages')
              div(
                v-for='stageName in activeStageNames',
                :key='stageName'
                class='shrink-0 border-r border-white/8',
                :style='{ width: stageColWidth(stageName) + "px" }'
                @mouseenter='hoveredStageName = stageName'
                @mouseleave='hoveredStageName = null'
              )
                div(
                  class='flex h-16 items-center justify-center border-b border-white/8 px-1 py-2 text-center text-xs font-normal transition-colors duration-150',
                  :class='stageHeaderClass(stageName)'
                )
                  span(class='line-clamp-4') {{ stageName }}
                div(
                  class='relative isolate transition-colors duration-150',
                  :style='{ height: totalHeight + "px" }',
                  :class='hoveredStageName === stageName ? stageTheme(stageName).cellActive : stageTheme(stageName).cell'
                )
                  template(v-for='hour in hourMarks', :key='hour')
                    div(
                      class='pointer-events-none absolute inset-x-0 border-t border-white/6',
                      :style='{ top: topPxFromHour(hour) + "px" }'
                    )
                  div(
                    v-for='s in stageItemsWithLanes(stageName)',
                    :key='s.id'
                    class='absolute box-border cursor-pointer p-0.5',
                    :style='cardStyle(s)'
                    @click='selectedStage = s'
                  )
                    div(
                      class='font-serif-tc h-full w-full overflow-hidden rounded px-1.5 py-1 text-xs leading-snug transition-colors duration-150',
                      :class='[stageCardClass(s), s.stackIndex > 0 ? "border-t border-white/15" : ""]'
                    )
                      div(class='font-semibold') {{ stageCardLabel(s) }}
            //- 活動場次欄
            template(v-if='showSessions')
              div(
                v-for='eid in activeEventIds',
                :key='eid'
                class='shrink-0 border-r border-white/8',
                :style='{ width: sessionColWidth(eid) + "px" }'
                @mouseenter='hoveredEid = eid'
                @mouseleave='hoveredEid = null'
              )
                div(
                  class='flex h-16 items-center justify-center border-b border-white/8 px-1 py-2 text-center text-xs leading-snug font-normal transition-colors duration-150',
                  :class='hoveredEid === eid ? "bg-zinc-800 text-white/90" : "bg-zinc-950 text-white/60"',
                  :title='eventNameMap.get(eid)'
                )
                  span(class='line-clamp-4') {{ shortEventName(eid) }}
                div(
                  class='relative isolate transition-colors duration-150',
                  :style='{ height: totalHeight + "px" }',
                  :class='hoveredEid === eid ? "bg-zinc-900/50" : "bg-zinc-950/30"'
                )
                  template(v-for='hour in hourMarks', :key='hour')
                    div(
                      class='pointer-events-none absolute inset-x-0 border-t border-white/6',
                      :style='{ top: topPxFromHour(hour) + "px" }'
                    )
                  div(
                    v-for='s in sessionItemsWithLanes(eid)',
                    :key='s.id'
                    class='absolute box-border cursor-pointer p-0.5',
                    :style='cardStyle(s)'
                    @click='selectedSession = s'
                  )
                    div(
                      class='font-serif-tc h-full w-full overflow-hidden rounded px-1.5 py-1 text-xs leading-snug text-white/90 transition-colors duration-150',
                      :class='[sessionCardClass(s), s.stackIndex > 0 ? "border-t border-white/15" : ""]'
                    )
                      div(class='font-semibold') {{ artistNames(s) }}

SessionModal(:session='selectedSession' @close='selectedSession = null')
StageModal(:stage='selectedStage' @close='selectedStage = null')
</template>
