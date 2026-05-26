import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f4ff',
          100: '#e5e4ff',
          200: '#cdcaff',
          300: '#a6a2ff',
          400: '#7c75ff',
          500: '#564dff',
          600: '#4138ee',
          700: '#3329c4',
          800: '#2a249e',
          900: '#27227e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
