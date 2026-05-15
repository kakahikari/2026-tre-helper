<script setup lang="ts">
  defineProps<{
    modelValue: string
    placeholder?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`

  function onInput(e: Event) {
    emit('update:modelValue', (e.target as HTMLInputElement).value)
  }
</script>

<template lang="pug">
div(class='sticky top-14 z-40 border-b border-white/8 bg-zinc-950/95')
  div(class='mx-auto max-w-200 px-6 py-4 backdrop-blur-sm')
    div(class='relative', :class='$slots.default ? "mb-3" : ""')
      span(
        v-html='searchIcon'
        class='pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/40'
      )
      input(
        :value='modelValue'
        @input='onInput'
        type='search',
        :placeholder='placeholder'
        class='w-full rounded-lg border border-white/12 bg-zinc-900 py-3 pr-4 pl-10 text-sm text-white transition-colors duration-200 outline-none placeholder:text-white/30 focus:border-white/40'
      )
    slot
</template>
