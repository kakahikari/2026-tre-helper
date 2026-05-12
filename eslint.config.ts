import { globalIgnores } from 'eslint/config'
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
// @ts-expect-error - eslint-plugin-vue-pug 尚無型別宣告
import pluginVuePug from 'eslint-plugin-vue-pug'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  ...pluginVuePug.configs['flat/recommended'],
  vueTsConfigs.recommended,

  // Pug 模板無法被 @typescript-eslint/no-unused-vars 正確解析，
  // 導致 <script setup> 中實際被模板使用的變數被誤報為未使用
  {
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  skipFormatting,
)
