import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { formatMoneyShort } from '@shared/utils';
import type { NetworkEdgeDto, NetworkNodeDto } from '@core/api/clients/network.api';

type Risk = 'alert' | 'warn' | 'ok';

interface PlacedNode {
  id: string;
  label: string;
  kind: 'proveedor' | 'asegurado';
  ciudad: string;
  casos: number;
  alertas: number;
  monto: number;
  listaRestrictiva: boolean;
  risk: Risk;
  /** 0-100 viewBox coords. */
  x: number;
  y: number;
  size: number;
}

interface PlacedEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  risk: Risk;
  width: number;
  provId: string;
  asegId: string;
}

/** Top-N nodes per column so the bipartite layout stays readable. */
const MAX_PER_COLUMN = 14;

function riskFromRatio(alertas: number, casos: number): Risk {
  const ratio = casos > 0 ? alertas / casos : 0;
  return ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'ok';
}

/**
 * Bipartite relationship graph: providers (left) linked to insured parties
 * (right) by the claims they share. A thick edge between a provider and an
 * insured that recurs across many claims is the core collusion signal.
 */
@Component({
  selector: 'network-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full min-h-[420px]">
      @if (placedNodes().length === 0) {
        <div class="flex-1 grid place-items-center text-ink-3 text-[13px] px-6 text-center">
          No hay relaciones proveedor–asegurado para los filtros actuales.
        </div>
      } @else {
        <div class="flex-1 relative px-4 py-4 overflow-auto" (mouseleave)="hoveredId.set(null)">
          <div class="relative w-full" [style.height.px]="canvasHeight()">
            <!-- Column headers -->
            <div class="absolute top-0 left-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Proveedores
            </div>
            <div class="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              Asegurados
            </div>

            <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              @for (e of placedEdges(); track e.id) {
                <line
                  [attr.x1]="e.x1"
                  [attr.y1]="e.y1"
                  [attr.x2]="e.x2"
                  [attr.y2]="e.y2"
                  [attr.stroke]="edgeStroke(e.risk)"
                  [attr.stroke-width]="e.width"
                  [attr.stroke-opacity]="edgeOpacity(e)"
                  stroke-linecap="round"
                  vector-effect="non-scaling-stroke"
                />
              }
            </svg>

            @for (n of placedNodes(); track n.id) {
              <button
                type="button"
                class="network-node absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full border-2 font-medium shadow-sm transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                [class]="nodeClass(n)"
                [class.opacity-30]="isDimmed(n.id)"
                [style.left.%]="n.x"
                [style.top.%]="n.y"
                [style.width.px]="n.size"
                [style.height.px]="n.size"
                [attr.aria-label]="n.label"
                (mouseenter)="hoveredId.set(n.id)"
                (focus)="hoveredId.set(n.id)"
                (blur)="hoveredId.set(null)"
                (click)="openNode.emit({ id: n.id, kind: n.kind })"
              >
                <span class="px-1 text-center leading-tight text-[8.5px]">{{ n.label }}</span>
              </button>
            }

            @if (hoveredNode(); as hn) {
              <div
                class="network-tooltip absolute z-30 pointer-events-none bg-surface border border-line rounded-lg shadow-pop p-3 w-[210px]"
                [style]="tooltipStyle(hn)"
              >
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="text-[12.5px] font-semibold text-ink leading-tight">{{ hn.label }}</div>
                  <span class="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border" [class]="kindBadge(hn.kind)">
                    {{ hn.kind === 'proveedor' ? 'Proveedor' : 'Asegurado' }}
                  </span>
                </div>
                <div class="text-[11px] text-ink-3 mb-2">{{ hn.ciudad }}</div>
                <div class="space-y-1 text-[11.5px]">
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Alertas</span>
                    <span class="font-semibold text-ink tabular-nums">{{ hn.alertas }} / {{ hn.casos }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Vínculos</span>
                    <span class="font-semibold text-ink tabular-nums">{{ linkCount(hn.id) }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Monto</span>
                    <span class="font-semibold text-ink tabular-nums">{{ money(hn.monto) }}</span>
                  </div>
                </div>
                @if (hn.listaRestrictiva) {
                  <div class="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-tier-red-soft text-tier-red-ink border border-[var(--tier-red)]">
                    Lista restrictiva
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-line text-[11.5px] text-ink-3">
        <div class="flex flex-wrap items-center gap-3.5">
          <span class="inline-flex items-center gap-1.5"><span class="tier-dot tier-dot-r" style="box-shadow:none"></span>Alto riesgo</span>
          <span class="inline-flex items-center gap-1.5"><span class="tier-dot tier-dot-y" style="box-shadow:none"></span>Medio</span>
          <span class="inline-flex items-center gap-1.5"><span class="tier-dot" style="background:var(--brand);box-shadow:none"></span>Estándar</span>
        </div>
        <span class="text-[11px] text-ink-2">
          {{ providerCount() }} proveedores · {{ aseguradoCount() }} asegurados · {{ placedEdges().length }} vínculos
        </span>
      </div>
    </div>
  `,
})
export class NetworkGraph {
  readonly nodes = input.required<readonly NetworkNodeDto[]>();
  readonly edges = input.required<readonly NetworkEdgeDto[]>();

  readonly openNode = output<{ id: string; kind: 'proveedor' | 'asegurado' }>();

  protected readonly hoveredId = signal<string | null>(null);

  /** Top-N providers + top-N insured by alertas, so the layout stays readable. */
  private readonly visible = computed(() => {
    const providers = this.nodes()
      .filter((n) => n.kind === 'proveedor')
      .sort((a, b) => b.alertas - a.alertas || b.casos - a.casos)
      .slice(0, MAX_PER_COLUMN);
    const asegurados = this.nodes()
      .filter((n) => n.kind === 'asegurado')
      .sort((a, b) => b.alertas - a.alertas || b.casos - a.casos)
      .slice(0, MAX_PER_COLUMN);
    return { providers, asegurados };
  });

  protected readonly providerCount = computed(() => this.visible().providers.length);
  protected readonly aseguradoCount = computed(() => this.visible().asegurados.length);

  protected readonly canvasHeight = computed(() => {
    const rows = Math.max(this.visible().providers.length, this.visible().asegurados.length, 1);
    return Math.max(380, rows * 46 + 40);
  });

  protected readonly placedNodes = computed<PlacedNode[]>(() => {
    const { providers, asegurados } = this.visible();
    const place = (list: NetworkNodeDto[], x: number): PlacedNode[] => {
      const n = list.length;
      return list.map((node, i) => ({
        id: node.id,
        label: shorten(node.label),
        kind: node.kind,
        ciudad: node.ciudad,
        casos: node.casos,
        alertas: node.alertas,
        monto: node.monto,
        listaRestrictiva: node.lista_restrictiva,
        risk: riskFromRatio(node.alertas, node.casos),
        x,
        // Spread between 8% and 94% of the canvas height.
        y: n === 1 ? 50 : 8 + (i / (n - 1)) * 86,
        size: 30 + Math.min(18, Math.round(node.casos * 1.1)),
      }));
    };
    return [...place(providers, 16), ...place(asegurados, 84)];
  });

  protected readonly placedEdges = computed<PlacedEdge[]>(() => {
    const byId = new Map(this.placedNodes().map((n) => [n.id, n]));
    const out: PlacedEdge[] = [];
    for (const e of this.edges()) {
      const p = byId.get(e.proveedor_id);
      const a = byId.get(e.asegurado_id);
      if (!p || !a) continue; // both endpoints must be visible
      out.push({
        id: `${e.proveedor_id}__${e.asegurado_id}`,
        x1: p.x,
        y1: p.y,
        x2: a.x,
        y2: a.y,
        risk: e.alertas > 0 ? (e.casos_compartidos >= 2 ? 'alert' : 'warn') : 'ok',
        width: Math.min(3, 0.6 + e.casos_compartidos * 0.5),
        provId: e.proveedor_id,
        asegId: e.asegurado_id,
      });
    }
    return out;
  });

  /** Node ids connected to the hovered node (via an edge). */
  private readonly connectedIds = computed<Set<string>>(() => {
    const id = this.hoveredId();
    if (!id) return new Set();
    const set = new Set<string>([id]);
    for (const e of this.placedEdges()) {
      if (e.provId === id) set.add(e.asegId);
      if (e.asegId === id) set.add(e.provId);
    }
    return set;
  });

  protected readonly hoveredNode = computed<PlacedNode | null>(() => {
    const id = this.hoveredId();
    if (!id) return null;
    return this.placedNodes().find((n) => n.id === id) ?? null;
  });

  protected isDimmed(id: string): boolean {
    const connected = this.connectedIds();
    return connected.size > 0 && !connected.has(id);
  }

  protected linkCount(id: string): number {
    return this.placedEdges().filter((e) => e.provId === id || e.asegId === id).length;
  }

  protected nodeClass(n: PlacedNode): string {
    if (n.kind === 'asegurado') {
      return n.risk === 'alert'
        ? 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink z-10'
        : 'border-line-2 bg-soft text-ink-2 z-10';
    }
    return n.risk === 'alert'
      ? 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink z-10'
      : n.risk === 'warn'
        ? 'border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink z-10'
        : 'border-[var(--brand)] bg-brand-soft text-brand-ink z-10';
  }

  protected edgeStroke(risk: Risk): string {
    return risk === 'alert' ? 'var(--tier-red)' : risk === 'warn' ? 'var(--tier-yellow)' : 'var(--brand)';
  }

  protected edgeOpacity(e: PlacedEdge): number {
    const id = this.hoveredId();
    if (!id) return e.risk === 'alert' ? 0.5 : e.risk === 'warn' ? 0.4 : 0.22;
    return e.provId === id || e.asegId === id ? 0.85 : 0.06;
  }

  protected kindBadge(kind: 'proveedor' | 'asegurado'): string {
    return kind === 'proveedor'
      ? 'bg-brand-soft text-brand-ink border-[var(--brand)]'
      : 'bg-soft text-ink-2 border-line-2';
  }

  protected tooltipStyle(n: PlacedNode): Record<string, string> {
    const placeRight = n.x < 50;
    const key = placeRight ? 'left' : 'right';
    const value = placeRight ? `${n.x + 4}%` : `${100 - n.x + 4}%`;
    const vertical = n.y > 70 ? 'translateY(-100%)' : n.y < 25 ? 'translateY(0%)' : 'translateY(-50%)';
    return { [key]: value, top: `${n.y}%`, transform: vertical };
  }

  protected money(amount: number): string {
    return formatMoneyShort(amount);
  }
}

function shorten(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return name.length <= 16 ? name : `${name.slice(0, 14)}…`;
  return `${words[0]} ${words[1]}`;
}
