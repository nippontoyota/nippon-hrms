/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#eb0a1e',
        'surface-tint': '#eb0a1e',
        success: '#16a34a',
        warning: '#d97706',
        info: '#2563eb',
        error: '#dc2626',
        // Brutalist slates
        'background': '#f8fafc',
        'surface': '#ffffff',
        'on-surface': '#0f172a',
        'on-surface-variant': '#64748b',
        'outline': '#cbd5e1',
      },

      fontFamily: {
        headline: ['Geist', 'sans-serif'],
        body: ['Geist', 'sans-serif'],
        label: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        'sm': 'none',
        DEFAULT: 'none',
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        'inner': 'none',
      }
    },
  },
  plugins: [],
};
