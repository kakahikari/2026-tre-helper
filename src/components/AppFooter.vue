<script setup lang="ts">
  import logoUrl from '@/assets/logo.webp'
</script>

<template lang="pug">
footer(class='border-t border-white/8 py-5')
  div(class='flex items-center justify-center gap-2')
    img(:src='logoUrl' alt='kakahikari logo' class='h-6 w-6')
    p(class='font-serif-tc text-xs tracking-widest text-white/25') © 2026 kakahikari
</template>
