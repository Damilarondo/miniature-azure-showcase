/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-0': token('surface-0'),
        'surface-1': token('surface-1'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        border: token('border'),
        'border-strong': token('border-strong'),
        'text-1': token('text-1'),
        'text-2': token('text-2'),
        'text-3': token('text-3'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        up: token('up'),
        down: token('down'),
        warn: token('warn'),
        review: token('review'),
        danger: token('danger'),
        'review-fill': token('review-fill'),
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: { none: '0', sm: '1px', DEFAULT: '2px', md: '2px', lg: '2px', full: '9999px' },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '22px'],
        xl: ['20px', '26px'],
      },
    },
  },
  plugins: [],
}
