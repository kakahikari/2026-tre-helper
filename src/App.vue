<script setup lang="ts">
  import AppHeader from '@/components/AppHeader.vue'
  import AppFooter from '@/components/AppFooter.vue'
  import BackToTop from '@/components/BackToTop.vue'
  import { RouterView } from 'vue-router'
</script>

<template lang="pug">
div(class='flex min-h-screen flex-col bg-black text-white')
  AppHeader
  main(class='flex-1 pt-14')
    RouterView
  AppFooter
  BackToTop
</template>
