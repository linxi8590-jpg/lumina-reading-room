/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: 'var(--paper-50)',
          100: 'var(--paper-100)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
        },
        lamp: {
          500: 'var(--lamp-500)',
          200: 'var(--lamp-200)',
        },
        sky: {
          700: 'var(--sky-700)',
          500: 'var(--sky-500)',
        },
        red: {
          500: 'var(--red-500)',
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'serif'],
        sans: ['Inter', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        reading: '70ch',
      },
    },
  },
  plugins: [],
}
