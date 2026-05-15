<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import type { Artist } from '@/types/index'
  import artistsData from '@/data/artists.json'
  import ArtistModal from '@/components/ArtistModal.vue'
  import StickySearchBar from '@/components/StickySearchBar.vue'
  import { useFavorites } from '@/composables/useFavorites'
  import { useRoute, useRouter } from 'vue-router'

  const route = useRoute()
  const router = useRouter()

  const artists = artistsData as Artist[]
  const selectedArtist = ref<Artist | null>(null)
  const query = ref((route.query.q as string) ?? '')

  const { isFavorite, toggleFavorite } = useFavorites()

  const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

  const starFilledIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

  const filteredArtists = computed(() => {
    const q = query.value.trim()
    const result = q ? artists.filter(a => a.name.includes(q)) : [...artists]
    return result.sort(
      (a, b) => (isFavorite(b.id) ? 1 : 0) - (isFavorite(a.id) ? 1 : 0),
    )
  })

  watch(query, val => {
    router.replace({ query: val ? { q: val } : {} })
  })
</script>

<template lang="pug">
div(class='min-h-screen')
  div(class='px-6 pt-12 pb-4')
    h1(
      class='font-serif-tc text-center text-2xl font-bold tracking-[0.3em] text-white'
    ) 女優陣容
  StickySearchBar(v-model='query' placeholder='請輸入名字…')
  div(class='px-6 pt-6 pb-12')
    ul(
      v-if='filteredArtists.length'
      class='mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3'
    )
      li(v-for='artist in filteredArtists', :key='artist.id' class='relative')
        button(
          @click='selectedArtist = artist'
          class='font-serif-tc hover:border-accent/60 hover:text-accent flex min-h-20 w-full cursor-pointer items-center justify-center rounded-lg border border-white/12 bg-zinc-900 px-4 py-3 text-center text-sm leading-snug font-bold tracking-[0.15em] text-white transition-colors duration-200 hover:bg-zinc-800 motion-reduce:transition-none sm:min-h-24 sm:text-lg sm:tracking-[0.2em]'
        ) {{ artist.name }}
        button(
          @click.stop='toggleFavorite(artist.id)',
          :aria-label='isFavorite(artist.id) ? "移除最愛" : "加入最愛"'
          class='absolute top-2 right-2 cursor-pointer border-none bg-transparent p-1 transition-colors duration-200 motion-reduce:transition-none',
          :class='isFavorite(artist.id) ? "text-yellow-400" : "text-white/25 hover:text-white/60"'
        )
          span(v-html='isFavorite(artist.id) ? starFilledIcon : starIcon')
    p(v-else class='mx-auto max-w-3xl text-center text-sm text-white/40') 找不到符合的女優
ArtistModal(:artist='selectedArtist' @close='selectedArtist = null')
</template>
