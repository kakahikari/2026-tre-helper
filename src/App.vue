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
main.page
  //- 活動主體
  section.event
    p.kicker 2026
    h1.title
      span.title-jp TRE台北國際紅人展
    p.date 7.03 &ndash; 7.05

  //- 分隔線
  hr.divider

  //- 票種與贈品
  section.offer
    p.ticket-label 週商套票組折扣碼
    p.ticket-label {{DISCOUNT_CODE}}
    button.code-copy(@click="copyCode" :class="{ copied }" aria-label="點擊複製折扣碼")
      span.code-saving 現省 200 元&ensp;
      span.code-val {{ copied ? '✓ 已複製' : '點擊複製' }}
    ul.ticket-label
      li TRE 限量 L 夾 + 紀念徽章

  //- 行動區
  section.action
    a.cta(
      href="https://jkface.net/redexpo/2026/ticket/142/NicoLoveAV"
      target="_blank"
      rel="noopener noreferrer"
    )
      span 帶入折扣碼，立即購票
</template>

<style scoped>
.page {
  --red: #e8003a;
  --bg: #000;
  --fg: #fff;
  --muted: rgba(255, 255, 255, 0.22);
  --font: 'Noto Serif TC', serif;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100svh;
  padding: 3rem 1.5rem;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  gap: 2.25rem;
}

/* ── 活動主體 ── */
.event {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.kicker {
  font-size: 2rem;
  letter-spacing: 0.5em;
  color: var(--red);
  font-weight: 700;
}

.title {
  margin: 0;
  line-height: 1;
}
.title-jp {
  font-size: clamp(2.25rem, 9vw, 5.5rem);
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--fg);
}

.date {
  font-size: clamp(0.85rem, 2.5vw, 1.1rem);
  letter-spacing: 0.35em;
  color: var(--muted);
  margin-top: 0.25rem;
}

/* ── 分隔 ── */
.divider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  width: 3rem;
  margin: 0;
}

/* ── 票種與贈品 ── */
.offer {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.ticket-label {
  font-size: clamp(1rem, 3vw, 1.3rem);
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--fg);
}

.perks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1.25rem;
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  color: var(--muted);
}
.perks li::before {
  content: '—  ';
  opacity: 0.4;
}

/* ── 折扣碼（offer 內） ── */
.code-copy {
  display: inline-flex;
  align-items: center;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.2rem;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-family: var(--font);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  transition:
    border-color 0.2s,
    color 0.2s;
}
.code-copy:hover {
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.6);
}
.code-copy:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.3);
  outline-offset: 2px;
}
.code-val {
  color: var(--fg);
  font-weight: 700;
  letter-spacing: 0.05em;
}
.code-saving {
  color: var(--red);
}
.copy-state {
  color: var(--fg);
  margin-left: 0.65rem;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.code-copy:hover .copy-state,
.code-copy.copied .copy-state {
  opacity: 1;
}

/* ── 行動區 ── */
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 320px;
}

.cta {
  display: block;
  width: 100%;
  padding: 1rem;
  background: var(--red);
  color: #fff;
  font-family: var(--font);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-align: center;
  text-decoration: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.cta:hover {
  opacity: 0.86;
  transform: translateY(-1px);
}
.cta:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 4px;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .cta,
  .code-copy,
  .copy-state {
    transition: none;
  }
}
</style>
