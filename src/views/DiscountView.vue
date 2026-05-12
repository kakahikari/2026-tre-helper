<script setup lang="ts">
  import { ref } from 'vue'

  const DISCOUNT_CODE = 'NicoLoveAV'
  const copied = ref(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      /* fallback */
    }
  }
</script>

<template lang="pug">
main(
  class='font-serif-tc flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-9 px-6 py-12'
)
  //- 活動主體
  section(class='flex flex-col items-center gap-[0.6rem] text-center')
    p(class='text-[2rem] font-bold tracking-[0.5em] text-[#e8003a]') 2026
    h1(class='m-0 leading-none')
      span(
        class='text-[clamp(2.25rem,9vw,5.5rem)] font-black tracking-wider text-white'
      ) TRE台北國際紅人展
    p(class='mt-1 text-[clamp(0.85rem,2.5vw,1.1rem)] tracking-[0.35em] text-white/22') 7.03 &ndash; 7.05

  //- 分隔線
  hr(class='m-0 w-12 border-t border-none border-white/8')

  //- 票種與贈品
  section(class='flex flex-col items-center gap-3 text-center')
    p(class='text-[clamp(1rem,3vw,1.3rem)] font-bold tracking-[0.15em] text-white') 週商套票組折扣碼
    p(class='text-[clamp(1rem,3vw,1.3rem)] font-bold tracking-[0.15em] text-white') {{ DISCOUNT_CODE }}
    button(
      @click='copyCode',
      :class='{ copied }'
      aria-label='點擊複製折扣碼'
      class='font-serif-tc inline-flex cursor-pointer items-center rounded-[0.2rem] border border-white/10 bg-transparent px-[0.9rem] py-[0.4rem] text-[0.72rem] tracking-[0.08em] text-white/22 transition-[border-color,color] duration-200 hover:border-white/25 hover:text-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30 motion-reduce:transition-none'
    )
      span(class='text-[#e8003a]') 現省 200 元&ensp;
      span(class='font-bold tracking-wider text-white') {{ copied ? '✓ 已複製' : '點擊複製' }}
    ul(
      class='m-0 list-none p-0 text-[clamp(1rem,3vw,1.3rem)] font-bold tracking-[0.15em] text-white'
    )
      li TRE 限量 L 夾 + 紀念徽章

  //- 行動區
  section(class='flex w-full max-w-xs flex-col items-center gap-4')
    a(
      href='https://jkface.net/redexpo/2026/ticket/142/NicoLoveAV'
      target='_blank'
      rel='noopener noreferrer'
      class='font-serif-tc block w-full cursor-pointer rounded-sm bg-[#e8003a] p-4 text-center text-[0.92rem] font-bold tracking-[0.12em] text-white no-underline transition-[opacity,transform] duration-200 hover:-translate-y-px hover:opacity-[0.86] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8003a] motion-reduce:transition-none'
    )
      span 帶入折扣碼，立即購票
</template>
