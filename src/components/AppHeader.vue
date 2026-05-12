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
    class='hamburger',
    :class='{ open: menuOpen }'
  )
    span(class='bar')
    span(class='bar')
    span(class='bar')
  RouterLink(to='/' class='site-name') 2026 TRE 活動小工具
  div(class='w-8' aria-hidden='true')
teleport(to='body')
  transition(name='nav-fade')
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
        class='nav-link'
      ) {{ link.label }}
</template>

<style scoped>
  .site-name {
    font-family: 'Noto Serif TC', serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    color: #fff;
    text-decoration: none;
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 4px;
    width: 2rem;
    background: none;
    border: none;
    cursor: pointer;
  }

  .bar {
    display: block;
    width: 20px;
    height: 1px;
    background: #fff;
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
    transform-origin: center;
  }

  .open .bar:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }
  .open .bar:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }
  .open .bar:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }

  .nav-link {
    font-family: 'Noto Serif TC', serif;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    color: #fff;
    text-decoration: none;
    transition: color 0.2s;
  }
  .nav-link:hover {
    color: #e8003a;
  }
  .nav-link.router-link-active {
    color: #e8003a;
  }

  .nav-fade-enter-active,
  .nav-fade-leave-active {
    transition: opacity 0.25s ease;
  }
  .nav-fade-enter-from,
  .nav-fade-leave-to {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar,
    .nav-link,
    .nav-fade-enter-active,
    .nav-fade-leave-active {
      transition: none;
    }
  }
</style>
