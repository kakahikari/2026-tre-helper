<script setup lang="ts">
  import AppHeader from '@/components/AppHeader.vue'
  import AppFooter from '@/components/AppFooter.vue'
  import BackToTop from '@/components/BackToTop.vue'
  import { RouterView } from 'vue-router'
  import { useRegisterSW } from 'virtual:pwa-register/vue'

  const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

<template lang="pug">
div(class='flex min-h-screen flex-col bg-black text-white')
  AppHeader
  main(class='flex-1 pt-14')
    RouterView
  AppFooter
  BackToTop
  //- PWA 更新提示
  Transition(name='slide-up')
    div(
      v-if='needRefresh'
      class='fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-md'
    )
      span 有新版本可用
      button(
        class='rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30'
        @click='updateServiceWorker()'
      ) 立即更新
</template>

<style scoped>
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translate(-50%, 1rem);
    opacity: 0;
  }
</style>
