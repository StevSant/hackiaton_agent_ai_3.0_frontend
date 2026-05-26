import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg)',
        surface: 'var(--bg-elev)',
        soft: 'var(--bg-soft)',
        hover: 'var(--hover)',
        line: 'var(--border)',
        'line-2': 'var(--border-2)',
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          2: 'var(--brand-2)',
          soft: 'var(--brand-soft)',
          ink: 'var(--brand-ink)',
        },
        tier: {
          green: 'var(--tier-green)',
          'green-soft': 'var(--tier-green-soft)',
          'green-ink': 'var(--tier-green-ink)',
          yellow: 'var(--tier-yellow)',
          'yellow-soft': 'var(--tier-yellow-soft)',
          'yellow-ink': 'var(--tier-yellow-ink)',
          red: 'var(--tier-red)',
          'red-soft': 'var(--tier-red-soft)',
          'red-ink': 'var(--tier-red-ink)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Times', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
      },
      spacing: {
        4.5: '1.125rem',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        pop: 'var(--shadow-pop)',
      },
      maxWidth: {
        'page': '1400px',
      },
    },
  },
  plugins: [],
};

export default config;
