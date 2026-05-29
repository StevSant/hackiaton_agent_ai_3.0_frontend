/** Canvas chart palette — hex mirrors :root tokens in styles.css (ECharts can't read CSS vars). */
export const INSIGHTS_CHART = {
  brand: '#5f7d9e',
  brandInk: '#4a6280',
  brandLight: '#8fa8c0',
  brandSoft: 'rgba(95, 125, 158, 0.14)',

  tierGreen: '#3a9b6a',
  tierGreenInk: '#2a734f',
  tierGreenSoft: 'rgba(58, 155, 106, 0.16)',

  tierYellow: '#c4a035',
  tierYellowInk: '#9a7b1a',
  tierYellowSoft: 'rgba(196, 160, 53, 0.16)',

  tierRed: '#c85555',
  tierRedInk: '#a03f3f',
  tierRedSoft: 'rgba(200, 85, 85, 0.16)',

  ink: '#64748b',
  ink2: '#475569',
  inkDark: '#334155',
  grid: '#e8edf2',
  bgSoft: '#f4f6f9',
  surface: '#ffffff',

  fontSans: 'Inter, system-ui, sans-serif',
  fontMono: 'JetBrains Mono, ui-monospace, monospace',
} as const;

export type AlertTier = 'verde' | 'amarillo' | 'rojo';

const BRAND_BAR_STEPS = ['#4a6280', '#5f7d9e', '#7a94b0', '#94aec9', '#aebdd0'] as const;

export function tierFill(tier: AlertTier | string): string {
  switch (tier) {
    case 'rojo':
      return INSIGHTS_CHART.tierRed;
    case 'amarillo':
      return INSIGHTS_CHART.tierYellow;
    case 'verde':
      return INSIGHTS_CHART.tierGreen;
    default:
      return INSIGHTS_CHART.brand;
  }
}

export function tierSoftFill(tier: AlertTier | string): string {
  switch (tier) {
    case 'rojo':
      return INSIGHTS_CHART.tierRedSoft;
    case 'amarillo':
      return INSIGHTS_CHART.tierYellowSoft;
    case 'verde':
      return INSIGHTS_CHART.tierGreenSoft;
    default:
      return INSIGHTS_CHART.brandSoft;
  }
}

/** Muted brand ramp for ranked bar charts (sidebar, regional). */
export function brandBarColor(index: number, total: number): string {
  if (total <= 1 || index === 0) return INSIGHTS_CHART.brandInk;
  const step = Math.min(index, BRAND_BAR_STEPS.length - 1);
  return BRAND_BAR_STEPS[step];
}

/** Keys mirror the backend's CANONICAL_RAMOS (app/domain/ramos.py). */
export const SLICE_COLORS: Readonly<Record<string, string>> = {
  vehiculos: INSIGHTS_CHART.brand,
  hogar: '#b08a5a',
  salud: '#5a8f84',
  vida: '#7a6b96',
  generales: '#8a9b5f',
  otros: '#94a3b8',
  other: '#94a3b8',
};
