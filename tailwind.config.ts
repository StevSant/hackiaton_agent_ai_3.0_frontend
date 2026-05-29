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
        centinela: {
          deep: 'var(--brand-ink)',
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
        mkt: {
          DEFAULT: 'var(--mkt-bg)',
          deep: 'var(--mkt-bg-deep)',
          ink: 'var(--mkt-ink)',
          'ink-2': 'var(--mkt-ink-2)',
          'ink-3': 'var(--mkt-ink-3)',
          'ink-4': 'var(--mkt-ink-4)',
          border: 'var(--mkt-border)',
          'border-subtle': 'var(--mkt-border-subtle)',
          accent: 'var(--mkt-accent)',
          'accent-ink': 'var(--mkt-accent-ink)',
          'accent-bright': 'var(--mkt-accent-bright)',
          'accent-muted': 'var(--mkt-accent-muted)',
          'accent-border': 'var(--mkt-accent-border)',
          chip: 'var(--mkt-chip-bg)',
          seal: 'var(--mkt-seal-bg)',
          'btn-ink': 'var(--mkt-btn-ink)',
          'btn-bg': 'var(--mkt-btn-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Hanken Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
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
