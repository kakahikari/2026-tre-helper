<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import type { Stage, Artist } from '@/types/index'
  import artistsData from '@/data/artists.json'
  import { useStagesFavorites } from '@/composables/useStagesFavorites'
  import { useRouter } from 'vue-router'

  defineProps<{
    stage: Stage | null
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const artists = artistsData as Artist[]
  const artistMap = new Map<number, string>(artists.map(a => [a.id, a.name]))

  const router = useRouter()
  const { isFavorite, toggleFavorite } = useStagesFavorites()

  function goToArtists(artistName: string) {
    emit('close')
    router.push({ name: 'artists', query: { q: artistName } })
  }

  const externalIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`
  const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
  const starFilledIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

  function modalTitle(s: Stage): string {
    if (s.artistIds.length) {
      return s.artistIds
        .map(id => artistMap.get(id) ?? '')
        .filter(Boolean)
        .join('、')
    }
    return s.activity
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template lang="pug">
teleport(to='body')
  transition(
    enter-active-class='transition-opacity duration-[250ms] ease-in-out'
    leave-active-class='transition-opacity duration-[250ms] ease-in-out'
    enter-from-class='opacity-0'
    leave-to-class='opacity-0'
  )
    div(
      v-if='stage'
      class='fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm'
      @click.self='emit("close")'
    )
      div(class='w-full max-w-md rounded-lg border border-white/12 bg-zinc-900 p-8')
        div(class='mb-6 flex items-start justify-between gap-4')
          div(class='flex items-start gap-2')
            button(
              @click='toggleFavorite(stage.id)',
              :aria-label='isFavorite(stage.id) ? "移除最愛" : "加入最愛"'
              class='cursor-pointer border-none bg-transparent p-1 transition-colors duration-200 motion-reduce:transition-none',
              :class='isFavorite(stage.id) ? "text-yellow-400" : "text-white/30 hover:text-white/60"'
            )
              span(v-html='isFavorite(stage.id) ? starFilledIcon : starIcon')
            h2(class='font-serif-tc text-xl font-bold tracking-[0.2em] text-white') {{ modalTitle(stage) }}
          button(
            @click='emit("close")'
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
            p(class='mb-1 text-xs tracking-[0.15em] text-white/40') 活動
            p(class='font-serif-tc text-sm text-white/80') {{ stage.activity }}
          div
            p(class='mb-1 text-xs tracking-[0.15em] text-white/40') 舞台
            p(class='font-serif-tc text-sm text-white/80') {{ stage.stage }}
          div
            p(class='mb-1 text-xs tracking-[0.15em] text-white/40') 時間
            p(class='font-mono text-sm text-white/80') {{ stage.date }} {{ stage.startTime }}–{{ stage.endTime }}
          div(v-if='stage.artistIds.length')
            p(class='mb-2 text-xs tracking-[0.15em] text-white/40') 女優
            ul(class='flex flex-col gap-1.5')
              li(
                v-for='artistId in stage.artistIds',
                :key='artistId'
                class='flex items-center gap-2'
              )
                button(
                  @click='goToArtists(artistMap.get(artistId) ?? "")'
                  class='hover:text-accent cursor-pointer border-none bg-transparent p-0 text-left text-sm text-white transition-colors duration-200'
                ) {{ artistMap.get(artistId) }}
                a(
                  :href='`https://jkface.net/profile/${artistId}`'
                  target='_blank'
                  rel='noopener noreferrer'
                  class='hover:text-accent shrink-0 text-white/40 transition-colors duration-200'
                )
                  span(v-html='externalIcon')
</template>
