/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--c-base) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        inset: 'rgb(var(--c-inset) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        hair: 'rgb(var(--c-hair) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"Songti SC"', '"Noto Serif SC"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei UI"', '"Segoe UI"', 'sans-serif'],
        mono: ['"SF Mono"', '"Cascadia Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
        92: '0.92',
      },
    },
  },
  plugins: [],
}
