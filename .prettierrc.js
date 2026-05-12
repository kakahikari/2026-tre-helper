export default {
  plugins: ['@prettier/plugin-pug', 'prettier-plugin-tailwindcss'],

  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  vueIndentScriptAndStyle: true,
  endOfLine: 'lf',

  // @prettier/plugin-pug
  // https://prettier.github.io/plugin-pug/guide/pug-specific-options.html
  pugClassNotation: 'attribute',
  pugAttributeSeparator: 'as-needed',
}
