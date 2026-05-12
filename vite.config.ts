import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// 建置後生成 dist/discount.html，讓 GitHub Pages 能正確回應 /discount 路由
// noindex 在 index.html 中，此處複製時替換為 canonical，讓爬蟲只索引 /discount
function generateDiscountRoute(): Plugin {
  return {
    name: 'generate-discount-route',
    apply: 'build',
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      const html = readFileSync(`${dist}/index.html`, 'utf-8')

      const CANONICAL =
        '<link rel="canonical" href="https://kakahikari.github.io/2026-tre-helper/discount" />'

      // 移除 noindex、插入 canonical
      const discountHtml = html
        .replace(/\s*<meta name="robots"[^>]*\/>/i, '')
        .replace('<!-- Open Graph -->', `${CANONICAL}\n    <!-- Open Graph -->`)

      writeFileSync(`${dist}/discount.html`, discountHtml)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/2026-tre-helper/',
  plugins: [vue(), vueDevTools(), tailwindcss(), generateDiscountRoute()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
