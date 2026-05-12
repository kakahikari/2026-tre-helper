<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink } from 'vue-router'

  const menuOpen = ref(false)

  const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`

  const ticketIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`

  const githubIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`

  const discountHref = `${import.meta.env.BASE_URL}${import.meta.env.DEV ? 'discount.html' : 'discount'}`

  const navLinks = [{ to: '/', label: '首頁', icon: homeIcon }]

  const pageLinks = [{ href: discountHref, label: '折扣碼', icon: ticketIcon }]

  const externalLinks = [
    {
      href: 'https://github.com/kakahikari/2026-tre-helper/',
      label: 'GitHub Repo',
      icon: githubIcon,
    },
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
      class='fixed inset-0 z-40 flex flex-col items-center justify-center bg-black'
      @click.self='menuOpen = false'
    )
      div(class='flex w-full max-w-3xl flex-col gap-10 px-12')
        RouterLink(
          v-for='link in navLinks',
          :key='link.to',
          :to='link.to'
          @click='menuOpen = false'
          class='font-serif-tc flex items-center gap-3 text-2xl font-bold tracking-[0.3em] text-white no-underline transition-colors duration-200 hover:text-[#e8003a] motion-reduce:transition-none [&.router-link-active]:text-[#e8003a]'
        )
          span(v-if='link.icon' v-html='link.icon')
          span {{ link.label }}
        a(
          v-for='link in pageLinks',
          :key='link.href',
          :href='link.href'
          @click='menuOpen = false'
          class='font-serif-tc flex items-center gap-3 text-2xl font-bold tracking-[0.3em] text-white no-underline transition-colors duration-200 hover:text-[#e8003a] motion-reduce:transition-none'
        )
          span(v-if='link.icon' v-html='link.icon')
          span {{ link.label }}
        a(
          v-for='link in externalLinks',
          :key='link.href',
          :href='link.href'
          target='_blank'
          rel='noopener noreferrer'
          @click='menuOpen = false'
          class='font-serif-tc flex items-center gap-3 text-2xl font-bold tracking-[0.3em] text-white no-underline transition-colors duration-200 hover:text-[#e8003a] motion-reduce:transition-none'
        )
          span(v-if='link.icon' v-html='link.icon')
          span {{ link.label }}
</template>
