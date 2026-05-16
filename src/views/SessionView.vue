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
  const hoveredTime = ref<string | null>(null)
  const hoveredEid = ref<number | null>(null)
  const hoveredStageName = ref<string | null>(null)
  const showMySchedule = ref(route.query.my === '1')
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

  const { isFavorite } = useSessionFavorites()
  const { isFavorite: isStageFavorite } = useStagesFavorites()

  const selectedStage = ref<Stage | null>(null)

  // 依日期 + 我的行程 + 搜尋字串篩選舞台
  const filteredStages = computed(() => {
    const base = stages.filter(s => s.date === activeDate.value)
    const afterFavorite = showMySchedule.value
      ? base.filter(s => isStageFavorite(s.id))
      : base
    const q = query.value.trim()
    if (!q) return afterFavorite
    return afterFavorite.filter(
      s =>
        s.title.includes(q) ||
        s.stage.includes(q) ||
        s.artistIds.some(id => (artistMap.get(id) ?? '').includes(q)),
    )
  })

  // 依首次出現順序取得該日有效舞台名稱
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

  // Stage grid: stageName → startTime → Stage[]
  const stageGrid = computed(() => {
    const map = new Map<string, Map<string, Stage[]>>()
    for (const s of filteredStages.value) {
      if (!map.has(s.stage)) map.set(s.stage, new Map())
      const inner = map.get(s.stage)!
      if (!inner.has(s.startTime)) inner.set(s.startTime, [])
      inner.get(s.startTime)!.push(s)
    }
    return map
  })

  // 僅含有效時間的場次，依選定日期篩選，再依搜尋字串篩選
  const filteredSessions = computed(() => {
    const base = sessions.filter(
      s => s.date === activeDate.value && s.startTime !== '',
    )
    const afterFavorite = showMySchedule.value
      ? base.filter(s => isFavorite(s.id))
      : base
    const q = query.value.trim()
    if (!q) return afterFavorite
    return afterFavorite.filter(
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

  // 排序後的時間段（合併場次與舞台）
  const timeSlots = computed(() => {
    const times = new Set<string>()
    if (showSessions.value) {
      for (const s of filteredSessions.value) times.add(s.startTime)
    }
    if (showStages.value) {
      for (const s of filteredStages.value) times.add(s.startTime)
    }
    return [...times].sort()
  })

  // grid: time → eventId → Session[]
  const grid = computed(() => {
    const map = new Map<string, Map<number, Session[]>>()
    for (const s of filteredSessions.value) {
      const time = s.startTime
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
    hoveredStageName.value = null
  }

  watch(
    [activeDate, query, showMySchedule, viewMode],
    ([date, q, my, view]) => {
      router.replace({
        query: {
          date,
          ...(q ? { q } : {}),
          ...(my ? { my: '1' } : {}),
          ...(view !== 'all' ? { view } : {}),
        },
      })
    },
  )

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

  function stageCellBg(stageName: string, time: string): string {
    const t = stageTheme(stageName)
    const active =
      hoveredStageName.value === stageName || hoveredTime.value === time
    return active ? t.cellActive : t.cell
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
        div(class='flex items-center gap-2')
          span(class='font-serif-tc shrink-0 text-sm tracking-wide text-white/40') 舞台/場次篩選
          div(ref='viewModeRef' class='relative')
            button(
              @click='viewModeOpen = !viewModeOpen'
              class='font-serif-tc flex min-w-25 cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/20 bg-zinc-900 px-3 py-1.5 text-sm tracking-wide text-white/80 transition-colors duration-200 hover:border-white/40'
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
        div(
          class='flex cursor-pointer items-center gap-2'
          @click='showMySchedule = !showMySchedule'
        )
          span(
            class='font-serif-tc text-sm tracking-wide transition-colors duration-200',
            :class='showMySchedule ? "text-accent" : "text-white/40"'
          ) 我的行程
          div(
            class='relative h-5 w-9 rounded-full transition-colors duration-200',
            :class='showMySchedule ? "bg-accent" : "bg-white/15"'
          )
            div(
              class='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
              :class='showMySchedule ? "translate-x-4" : "translate-x-0.5"'
            )
  //- 格線
  div(class='px-2 pt-2 pb-8 sm:px-6 sm:pt-4 sm:pb-12')
    div(v-if='timeSlots.length' class='overflow-x-auto rounded-lg border border-white/8')
      table(class='min-w-max border-collapse text-xs' @mouseleave='clearHover')
        thead
          tr
            th(
              class='sticky left-0 z-20 w-10 border-r border-b border-white/8 bg-zinc-950 px-1.5 py-1 text-center text-xs font-normal text-white/40 sm:w-16 sm:px-3 sm:py-2'
            ) 時間
            template(v-if='showStages')
              th(
                v-for='stageName in activeStageNames',
                :key='stageName'
                class='w-20 border-r border-b border-white/8 px-1 py-1 text-center text-xs font-normal transition-colors duration-150 sm:w-28 sm:px-2 sm:py-2',
                :class='stageHeaderClass(stageName)'
                @mouseenter='hoveredStageName = stageName'
                @mouseleave='hoveredStageName = null'
              ) {{ stageName }}
            th(
              v-for='eid in activeEventIds',
              :key='eid',
              :title='eventNameMap.get(eid)'
              class='w-20 border-r border-b border-white/8 px-1 py-1 text-center text-xs leading-snug font-normal transition-colors duration-150 sm:w-28 sm:px-2 sm:py-2',
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
              class='sticky left-0 z-10 border-r border-b border-white/6 px-1.5 py-1 text-center font-mono text-white/50 transition-colors duration-150 sm:px-3 sm:py-1.5',
              :class='hoveredTime === time ? "bg-zinc-800" : "bg-zinc-950"'
            ) {{ time }}
            template(v-if='showStages')
              td(
                v-for='stageName in activeStageNames',
                :key='stageName'
                class='border-r border-b border-white/6 px-0.5 py-0.5 align-top transition-colors duration-150 sm:px-1.5 sm:py-1',
                :class='stageCellBg(stageName, time)'
                @mouseenter='hoveredStageName = stageName'
                @mouseleave='hoveredStageName = null'
              )
                template(v-if='stageGrid.get(stageName)?.get(time)')
                  div(
                    v-for='s in stageGrid.get(stageName)?.get(time)',
                    :key='s.id'
                    @click='selectedStage = s'
                    class='font-serif-tc mb-0.5 cursor-pointer rounded px-1.5 py-0.5 leading-snug transition-colors duration-150',
                    :class='stageCardClass(s)'
                  ) {{ stageCardLabel(s) }}
            td(
              v-for='eid in activeEventIds',
              :key='eid'
              class='border-r border-b border-white/6 px-0.5 py-0.5 align-top transition-colors duration-150 sm:px-1.5 sm:py-1',
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
StageModal(:stage='selectedStage' @close='selectedStage = null')
</template>
