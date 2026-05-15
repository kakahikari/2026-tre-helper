<script setup lang="ts">
  import { computed, onMounted, onUnmounted } from 'vue'
  import type { Artist, Booth, Event } from '@/types/index'
  import booths from '@/data/booths.json'
  import events from '@/data/events.json'
  import { useFavorites } from '@/composables/useFavorites'
  import { useRouter } from 'vue-router'

  const props = defineProps<{
    artist: Artist | null
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  const router = useRouter()
  const { isFavorite, toggleFavorite } = useFavorites()

  function goToSessions(eventName: string) {
    emit('close')
    router.push({ name: 'sessions', query: { q: eventName } })
  }

  const artistBooths = computed<Booth[]>(() =>
    (booths as Booth[]).filter(b =>
      b.artistIds.includes(props.artist?.id ?? -1),
    ),
  )

  const artistEvents = computed<Event[]>(() =>
    (events as Event[]).filter(e =>
      e.artistIds.includes(props.artist?.id ?? -1),
    ),
  )

  const websiteUrl = computed(() =>
    props.artist ? `https://jkface.net/profile/${props.artist.id}` : '',
  )

  const externalIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`

  const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

  const starFilledIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

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
      v-if='artist'
      class='fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm'
      @click.self='emit("close")'
    )
      div(class='w-full max-w-md rounded-lg border border-white/12 bg-zinc-900 p-8')
        div(class='mb-6 flex items-start justify-between gap-4')
          div(class='flex items-start gap-2')
            button(
              @click='toggleFavorite(artist.id)',
              :aria-label='isFavorite(artist.id) ? "移除最愛" : "加入最愛"'
              class='cursor-pointer border-none bg-transparent p-1 transition-colors duration-200 motion-reduce:transition-none',
              :class='isFavorite(artist.id) ? "text-yellow-400" : "text-white/30 hover:text-white/60"'
            )
              span(v-html='isFavorite(artist.id) ? starFilledIcon : starIcon')
            h2(class='font-serif-tc text-2xl font-bold tracking-[0.2em] text-white') {{ artist.name }}
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
        div(class='flex flex-col gap-5')
          div
            p(class='mb-2 text-xs tracking-[0.15em] text-white/40') 參加攤位
            ul(v-if='artistBooths.length' class='flex flex-col gap-1')
              li(
                v-for='booth in artistBooths',
                :key='booth.id'
                class='text-sm text-white'
              ) {{ booth.id }}｜{{ booth.name }}
            p(v-else class='text-sm text-white/40') —
          div
            p(class='mb-2 text-xs tracking-[0.15em] text-white/40') 參加活動
            ul(v-if='artistEvents.length' class='flex flex-col gap-1')
              li(
                v-for='event in artistEvents',
                :key='event.id'
                class='flex items-center gap-2'
              )
                button(
                  @click='goToSessions(event.name)'
                  class='hover:text-accent cursor-pointer border-none bg-transparent p-0 text-left text-sm text-white transition-colors duration-200'
                ) {{ event.name }}
                a(
                  :href='`https://jkface.net/events/${event.id}`'
                  target='_blank'
                  rel='noopener noreferrer'
                  class='hover:text-accent shrink-0 text-white/40 transition-colors duration-200'
                )
                  span(v-html='externalIcon')
            p(v-else class='text-sm text-white/40') —
          div
            p(class='mb-2 text-xs tracking-[0.15em] text-white/40') JKFACE
            a(
              :href='websiteUrl'
              target='_blank'
              rel='noopener noreferrer'
              class='hover:text-accent inline-flex items-center gap-1.5 text-sm text-white no-underline transition-colors duration-200'
            )
              span {{ websiteUrl }}
              span(v-html='externalIcon')
</template>
