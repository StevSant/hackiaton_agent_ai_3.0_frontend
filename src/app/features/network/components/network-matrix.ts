import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { formatMoneyShort } from '@shared/utils';
import type { NetworkEdgeDto, NetworkNodeDto } from '@core/api/clients/network.api';

type Risk = 'alert' | 'warn' | 'ok';

interface Cell {
  edge: NetworkEdgeDto;
  risk: Risk;
  /** 0-1 fill strength by shared-claim count. */
  intensity: number;
}

const MAX_ROWS = 10; // providers
const MAX_COLS = 14; // insured

function edgeRisk(e: NetworkEdgeDto): Risk {
  if (e.alertas <= 0) return 'ok';
  return e.casos_compartidos >= 2 ? 'alert' : 'warn';
}

/**
 * Adjacency-matrix view of the relationship graph: providers as rows, insured
 * as columns, each cell shaded by how many claims the pair shares. Zero edge
 * crossings — best for spotting a provider that lights up across many insured
 * (a hub) or a column that several providers touch.
 */
@Component({
  selector: 'network-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length === 0 || cols().length === 0) {
      <div class="min-h-[420px] grid place-items-center text-ink-3 text-[13px] px-6 text-center">
        No hay relaciones proveedor–asegurado para los filtros actuales.
      </div>
    } @else {
      <div class="relative px-4 py-4 overflow-auto">
        <table class="border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 bg-surface"></th>
              @for (c of cols(); track c.id) {
                <th class="align-bottom p-0">
                  <div class="h-[78px] w-[26px] flex items-end justify-center">
                    <span
                      class="origin-bottom-left rotate-[-60deg] translate-x-2 whitespace-nowrap text-ink-3 font-medium"
                      [title]="c.label"
                    >{{ firstName(c.label) }}</span>
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id; let ri = $index) {
              <tr>
                <th
                  class="sticky left-0 z-10 bg-surface text-right pr-2 font-medium text-ink-2 max-w-[140px] truncate cursor-pointer hover:text-brand-ink"
                  [title]="r.label"
                  (click)="openNode.emit({ id: r.id, kind: 'proveedor' })"
                >
                  {{ r.label }}
                </th>
                @for (c of cols(); track c.id; let ci = $index) {
                  <td class="p-[2px]">
                    @if (cell(r.id, c.id); as cl) {
                      <button
                        type="button"
                        class="w-[22px] h-[22px] rounded-[5px] grid place-items-center text-[9px] font-semibold tabular-nums transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        [style.background]="cellBg(cl)"
                        [style.color]="cl.intensity > 0.55 ? 'white' : 'var(--ink-2)'"
                        [attr.aria-label]="r.label + ' ↔ ' + c.label"
                        (mouseenter)="hovered.set({ cl, r: r.label, c: c.label })"
                        (mouseleave)="hovered.set(null)"
                        (click)="openNode.emit({ id: r.id, kind: 'proveedor' })"
                      >
                        {{ cl.edge.casos_compartidos }}
                      </button>
                    } @else {
                      <div class="w-[22px] h-[22px] rounded-[5px] bg-soft/40"></div>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>

        @if (hovered(); as h) {
          <div class="mt-3 inline-flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg border border-line bg-surface text-[11.5px]">
            <span class="font-semibold text-ink">{{ h.r }} ↔ {{ h.c }}</span>
            <span class="text-tier-red-ink font-semibold tabular-nums">{{ h.cl.edge.alertas }} alertas</span>
            <span class="text-ink-3 tabular-nums">{{ h.cl.edge.casos_compartidos }} siniestros</span>
            <span class="text-ink-2 tabular-nums">{{ money(h.cl.edge.monto) }}</span>
          </div>
        }
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-line text-[11.5px] text-ink-3">
        <div class="flex items-center gap-2">
          <span>Menos</span>
          <span class="w-4 h-3 rounded-sm" style="background: color-mix(in oklch, var(--tier-red) 20%, transparent)"></span>
          <span class="w-4 h-3 rounded-sm" style="background: color-mix(in oklch, var(--tier-red) 55%, transparent)"></span>
          <span class="w-4 h-3 rounded-sm" style="background: var(--tier-red)"></span>
          <span>Más siniestros compartidos</span>
        </div>
        <span class="text-[11px] text-ink-2">{{ rows().length }} proveedores × {{ cols().length }} asegurados</span>
      </div>
    }
  `,
})
export class NetworkMatrix {
  readonly nodes = input.required<readonly NetworkNodeDto[]>();
  readonly edges = input.required<readonly NetworkEdgeDto[]>();

  readonly openNode = output<{ id: string; kind: 'proveedor' | 'asegurado' }>();

  protected readonly hovered = signal<{ cl: Cell; r: string; c: string } | null>(null);

  protected readonly rows = computed<NetworkNodeDto[]>(() =>
    this.nodes()
      .filter((n) => n.kind === 'proveedor')
      .sort((a, b) => b.alertas - a.alertas || b.casos - a.casos)
      .slice(0, MAX_ROWS),
  );

  protected readonly cols = computed<NetworkNodeDto[]>(() => {
    const rowIds = new Set(this.rows().map((r) => r.id));
    const linked = new Map<string, number>();
    for (const e of this.edges()) {
      if (!rowIds.has(e.proveedor_id)) continue;
      linked.set(e.asegurado_id, (linked.get(e.asegurado_id) ?? 0) + e.alertas);
    }
    const byId = new Map(this.nodes().filter((n) => n.kind === 'asegurado').map((n) => [n.id, n]));
    return [...linked.keys()]
      .map((id) => byId.get(id))
      .filter((n): n is NetworkNodeDto => n != null)
      .sort((a, b) => (linked.get(b.id) ?? 0) - (linked.get(a.id) ?? 0))
      .slice(0, MAX_COLS);
  });

  private readonly cellMap = computed<Map<string, Cell>>(() => {
    const maxCasos = Math.max(1, ...this.edges().map((e) => e.casos_compartidos));
    const m = new Map<string, Cell>();
    for (const e of this.edges()) {
      m.set(`${e.proveedor_id}|${e.asegurado_id}`, {
        edge: e,
        risk: edgeRisk(e),
        intensity: e.casos_compartidos / maxCasos,
      });
    }
    return m;
  });

  protected cell(provId: string, asegId: string): Cell | undefined {
    return this.cellMap().get(`${provId}|${asegId}`);
  }

  protected cellBg(cl: Cell): string {
    const color =
      cl.risk === 'alert' ? 'var(--tier-red)' : cl.risk === 'warn' ? 'var(--tier-yellow)' : 'var(--brand)';
    const pct = Math.round(25 + cl.intensity * 60); // 25%..85%
    return `color-mix(in oklch, ${color} ${pct}%, transparent)`;
  }

  protected firstName(label: string): string {
    return label.split(/\s+/)[0] ?? label;
  }

  protected money(amount: number): string {
    return formatMoneyShort(amount);
  }
}
