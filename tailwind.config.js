/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        surface2: token('surface-2'),
        line: token('border'),
        text: token('text'),
        muted: token('text-muted'),
        primary: {
          DEFAULT: token('primary'),
          fg: token('primary-fg'),
          soft: token('primary-soft'),
          strong: token('primary-strong'),
        },
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
          fg: token('accent-fg'),
        },
        success: {
          DEFAULT: token('success'),
          soft: token('success-soft'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
        },
        info: {
          DEFAULT: token('info'),
          soft: token('info-soft'),
        },
        ai: {
          DEFAULT: token('ai'),
          soft: token('ai-soft'),
        },
      },
      borderRadius: {
        lg: '0.625rem',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'SFMono-Regular', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 hsl(215 28% 17% / 0.05)',
        pop: '0 12px 32px -8px hsl(215 28% 17% / 0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
