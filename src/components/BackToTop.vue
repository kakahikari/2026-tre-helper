<script setup lang="ts">
  import { useWindowScroll } from '@vueuse/core'

  const { y } = useWindowScroll()

  const backToTopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 19V5"/>
  <path d="M5 12l7-7 7 7"/>
</svg>`

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>

<template lang="pug">
Transition(name='back-to-top')
  button(
    v-if='y > 200'
    class='fixed right-6 bottom-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95'
    aria-label='回到頂部'
    @click='scrollToTop'
  )
    span(v-html='backToTopIcon')
</template>

<style scoped>
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
  .back-to-top-enter-from,
  .back-to-top-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }
</style>
