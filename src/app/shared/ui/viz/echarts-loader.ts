// src/app/shared/ui/viz/echarts-loader.ts

// Loaded once on first chart render and reused across instances — ECharts is
// ~1.2 MB gzipped so we keep it out of the initial app bundle.
export type EChartsModule = typeof import('echarts');

let echartsModulePromise: Promise<EChartsModule> | null = null;

export function loadECharts(): Promise<EChartsModule> {
  if (echartsModulePromise === null) {
    echartsModulePromise = import('echarts');
  }
  return echartsModulePromise;
}
