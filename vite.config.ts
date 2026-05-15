import { fileURLToPath, URL } from 'node:url'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

function injectGoogleAnalytics(): Plugin {
  const googleAnalyticsId = process.env.VITE_GOOGLE_ANALYTICS_ID?.trim()
  const googleAnalyticsTag = googleAnalyticsId
    ? `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || []
      function gtag() {
        dataLayer.push(arguments)
      }
      gtag('js', new Date())

      gtag('config', '${googleAnalyticsId}')
    </script>`
    : ''

  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      return html.replace('<!-- GOOGLE_ANALYTICS_TAG -->', googleAnalyticsTag)
    },
  }
}

// 建置後補出 dist/discount/index.html，讓靜態部署可直接命中 /discount
function generateDiscountRoute(): Plugin {
  return {
    name: 'generate-discount-route',
    apply: 'build',
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      const discountHtml = readFileSync(`${dist}/discount.html`, 'utf-8')

      mkdirSync(`${dist}/discount`, { recursive: true })
      writeFileSync(`${dist}/discount/index.html`, discountHtml)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/2026-tre-helper/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    injectGoogleAnalytics(),
    generateDiscountRoute(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        discount: fileURLToPath(new URL('./discount.html', import.meta.url)),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
