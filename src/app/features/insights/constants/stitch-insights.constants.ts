/** Design tokens and assets from Stitch project "Sur AI Claims Guard" / screen "Insights de IA (Web)". */
export const STITCH_INSIGHTS = {
  projectId: '17794558564707199014',
  screenId: '45dbdb97203e4f8796ac22bcf06ecefb',
  colors: {
    background: '#f9f9f9',
    primary: '#000515',
    primaryContainer: '#041e41',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#7287af',
    primaryFixed: '#d7e3ff',
    secondary: '#00658d',
    aiAccent: '#8b5cf6',
    riskHigh: '#ef4444',
    riskMedium: '#f59e0b',
    riskLow: '#10b981',
    outlineVariant: '#c4c6cf',
    onSurface: '#1a1c1c',
    onSurfaceVariant: '#44474e',
    surfaceContainerHighest: '#e2e2e2',
    surfaceContainerHigh: '#e8e8e8',
    surfaceContainer: '#eeeeee',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    healthSlice: '#00aeef',
  },
  mapImageUrl: '/assets/insights/ecuador-terrain.jpg',
  /** Stitch uses a Google AIDA-generated topographic satellite image at 20% opacity over a dot grid. */
  mapImageRemote:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDUVS9kWek_XQwJC_x7k27k-QPUC15Q9aM4_V6ODNO__itia09-JqVnobh_oJORYNRQ9uvwkkmUdzsSD3MUY2Cwn2FppujL-GM3RJkHnkXnP0FXhNdP9Bo8HOH75OLmx2rhPp-00q5PdV4dg0xgmAwXH76kh7nkXkvJkCYlzsfqeptv-AUzbqtmy2g-vamggTolTZDyignDrYq2MB5jA3L1KfAX__JboMvC8tywN3hqGaXfEabtO2z21loqydf-d-RvOUOguzo88xlp',
  avatarUrl: '/assets/insights/analyst-avatar.jpg',
} as const;

export const STITCH_REGIONAL_BARS = [
  { region: 'Pichincha', heightPct: 70, opacity: 1 },
  { region: 'Guayas', heightPct: 45, opacity: 0.8 },
  { region: 'Azuay', heightPct: 90, opacity: 0.6 },
  { region: 'Manabí', heightPct: 30, opacity: 0.4 },
  { region: 'El Oro', heightPct: 15, opacity: 0.2 },
] as const;

export const STITCH_CLAIM_SLICES = [
  { label: 'Automotriz', pct: 60, color: '#3b82f6' },
  { label: 'Salud', pct: 25, color: '#00aeef' },
  { label: 'Vida/PYMES', pct: 15, color: '#8b5cf6' },
] as const;
