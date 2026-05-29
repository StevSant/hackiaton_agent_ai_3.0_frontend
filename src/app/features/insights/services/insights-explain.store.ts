import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { InsightsApi } from '@core/api/clients/insights.api';

import type { ChartExplainContext } from '../utils/chart-explain-context';

export interface ChartExplainEntry {
  loading: boolean;
  open: boolean;
  text: string | null;
  error: string | null;
}

const EMPTY_ENTRY: ChartExplainEntry = {
  loading: false,
  open: false,
  text: null,
  error: null,
};

/**
 * Per-chart AI explanation state for the city insights dashboard. Provided at the
 * page level so it resets when the page is destroyed; `reset()` clears it on city
 * change (the page instance is reused across route params).
 */
@Injectable()
export class InsightsExplainStore {
  private readonly api = inject(InsightsApi);

  private readonly _entries = signal<Record<string, ChartExplainEntry>>({});
  readonly entries = this._entries.asReadonly();

  async explain(ctx: ChartExplainContext): Promise<void> {
    const current = this._entries()[ctx.chartId];
    if (current?.loading) return;
    // Already generated — a click just toggles the panel, no re-fetch.
    if (current?.text) {
      this.toggle(ctx.chartId);
      return;
    }
    this.patch(ctx.chartId, { loading: true, open: true, text: null, error: null });
    try {
      const res = await firstValueFrom(
        this.api.explainChart({
          ciudad: ctx.ciudad,
          chart_id: ctx.chartId,
          chart_kind: ctx.chartKind,
          chart_title: ctx.chartTitle,
          resumen: ctx.resumen,
        }),
      );
      this.patch(ctx.chartId, { loading: false, open: true, text: res.explicacion_markdown });
    } catch {
      this.patch(ctx.chartId, {
        loading: false,
        open: true,
        error: 'No pudimos generar la explicación. Intenta de nuevo.',
      });
    }
  }

  toggle(chartId: string): void {
    const entry = this._entries()[chartId];
    if (!entry) return;
    this.patch(chartId, { open: !entry.open });
  }

  reset(): void {
    this._entries.set({});
  }

  private patch(chartId: string, partial: Partial<ChartExplainEntry>): void {
    this._entries.update((entries) => ({
      ...entries,
      [chartId]: { ...EMPTY_ENTRY, ...entries[chartId], ...partial },
    }));
  }
}
