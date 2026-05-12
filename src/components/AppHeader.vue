<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink } from 'vue-router'

  const menuOpen = ref(false)

  const navLinks = [
    { to: '/', label: '首頁' },
    { to: '/discount', label: '折扣碼' },
  ]
</script>

<template lang="pug">
header(
  class='fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-white/8 bg-black/90 px-6 backdrop-blur-sm'
)
  button(
    @click='menuOpen = !menuOpen',
    :aria-expanded='menuOpen'
    aria-label='切換選單'
    class='flex w-8 cursor-pointer flex-col gap-[5px] border-none bg-transparent p-1'
  )
    span(
      class='block h-px w-5 origin-center bg-white transition-[transform,opacity] duration-[250ms] ease-in-out motion-reduce:transition-none',
      :class='menuOpen ? "translate-y-[6px] rotate-45" : ""'
    )
    span(
      class='block h-px w-5 origin-center bg-white transition-[transform,opacity] duration-[250ms] ease-in-out motion-reduce:transition-none',
      :class='menuOpen ? "scale-x-0 opacity-0" : ""'
    )
    span(
      class='block h-px w-5 origin-center bg-white transition-[transform,opacity] duration-[250ms] ease-in-out motion-reduce:transition-none',
      :class='menuOpen ? "-translate-y-[6px] -rotate-45" : ""'
    )
  RouterLink(
    to='/'
    class='font-serif-tc text-[0.85rem] font-bold tracking-[0.3em] text-white no-underline'
  ) 2026 TRE 活動小工具
  div(class='w-8' aria-hidden='true')
teleport(to='body')
  transition(
    enter-active-class='transition-opacity duration-[250ms] ease-in-out'
    leave-active-class='transition-opacity duration-[250ms] ease-in-out'
    enter-from-class='opacity-0'
    leave-to-class='opacity-0'
  )
    nav(
      v-if='menuOpen'
      class='fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-black'
      @click.self='menuOpen = false'
    )
      RouterLink(
        v-for='link in navLinks',
        :key='link.to',
        :to='link.to'
        @click='menuOpen = false'
        class='font-serif-tc text-2xl font-bold tracking-[0.3em] text-white no-underline transition-colors duration-200 hover:text-[#e8003a] motion-reduce:transition-none [&.router-link-active]:text-[#e8003a]'
      ) {{ link.label }}
</template>
