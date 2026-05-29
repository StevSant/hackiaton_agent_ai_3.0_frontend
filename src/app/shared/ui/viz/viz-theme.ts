// src/app/shared/ui/viz/viz-theme.ts

/** Categorical series palette (brand-led). */
export const VIZ_PALETTE = [
  '#6286B8',
  '#7A9CC9',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
] as const;

/** Traffic-light tier colors — single source of truth for every viz primitive. */
export const TIER_COLOR: Record<'verde' | 'amarillo' | 'rojo', string> = {
  verde: '#10b981',
  amarillo: '#f59e0b',
  rojo: '#ef4444',
};

/** Readable on both light and dark surfaces (slate-400). */
export const AXIS_TEXT = '#94a3b8';

export const TOOLTIP_BG = 'rgba(15,23,42,0.96)';
export const TOOLTIP_BORDER = 'rgba(99,102,241,0.45)';
