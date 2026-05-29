import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';
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
  x: number; // 0-100 viewBox coords
  y: number;
  size: number;
}

interface PlacedEdge {
  id: string;
  path: string;
  risk: Risk;
  width: number;
  provId: string;
  asegId: string;
}

/** Top providers shown — fewer nodes keeps the bipartite layout legible. */
const MAX_PROVIDERS = 8;
/** Cap on insured shown (only those linked to a visible provider). */
const MAX_INSURED = 12;
const PROV_X = 17;
const ASEG_X = 83;

function riskFromRatio(alertas: number, casos: number): Risk {
  const ratio = casos > 0 ? alertas / casos : 0;
  return ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'ok';
}

/**
 * Bipartite relationship graph: a few high-risk providers (left) linked to the
 * insured parties they share claims with (right). Curved edges + barycenter
 * ordering of the insured column keep crossings down; hovering a node isolates
 * its links so the analyst can read one relationship at a time.
 */
@Component({
  selector: 'network-graph',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full min-h-[420px]">
      @if (placedNodes().length === 0) {
        <div class="flex-1 grid place-items-center text-ink-3 text-[13px] px-6 text-center">
          No hay relaciones proveedor–asegurado para los filtros actuales.
        </div>
      } @else {
        @if (focusedNode(); as fn) {
          <div class="flex items-center gap-2 mx-4 mt-3 px-3 py-2 rounded-lg border border-brand bg-brand-soft text-[12px]">
            <ui-icon name="filter_center_focus" [size]="15" class="text-brand-ink" />
            <span class="text-ink-2">
              Mostrando vínculos de <span class="font-semibold text-ink">{{ fn.label }}</span> ·
              {{ linkCount(fn.id) }} vínculo{{ linkCount(fn.id) === 1 ? '' : 's' }}
            </span>
            <button
              type="button"
              class="ml-auto text-brand-ink font-medium hover:underline"
              (click)="openNode.emit({ id: fn.id, kind: fn.kind })"
            >
              Abrir detalle
            </button>
            <button
              type="button"
              class="text-ink-3 hover:text-ink font-medium"
              (click)="focusId.set(null)"
            >
              Ver todo
            </button>
          </div>
        }
        <div
          class="flex-1 relative px-4 py-4 overflow-x-hidden overflow-y-auto"
          (mouseleave)="hoveredId.set(null)"
          (click)="focusId.set(null)"
        >
          <div
            class="relative"
            [class]="layout() === 'columnas' ? 'w-full' : 'w-full max-w-[560px] aspect-square mx-auto'"
            [style.height.px]="layout() === 'columnas' ? canvasHeight() : null"
          >
            @if (layout() === 'columnas') {
              <div class="absolute top-0 left-0 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                Proveedores
              </div>
              <div class="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Asegurados
              </div>
            }

            <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              @for (e of placedEdges(); track e.id) {
                <path
                  [attr.d]="e.path"
                  fill="none"
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
                class="network-node absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full border-2 shadow-sm transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                [class]="nodeClass(n)"
                [class.opacity-25]="isDimmed(n.id)"
                [class.scale-110]="isFocused(n.id)"
                [style.left.%]="n.x"
                [style.top.%]="n.y"
                [style.width.px]="n.size"
                [style.height.px]="n.size"
                [attr.aria-label]="n.label"
                (mouseenter)="hoveredId.set(n.id)"
                (focus)="hoveredId.set(n.id)"
                (blur)="hoveredId.set(null)"
                (click)="onNodeClick(n, $event)"
              >
                <span class="px-1 text-center leading-[1.05] text-[9.5px] font-medium line-clamp-2">{{ n.label }}</span>
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
                <div class="mt-2 text-[10.5px] text-ink-3 italic">Clic para aislar sus vínculos</div>
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
          {{ providerCount() }} proveedores · {{ insuredCount() }} asegurados · {{ placedEdges().length }} vínculos
        </span>
      </div>
    </div>
  `,
})
export class NetworkGraph {
  readonly nodes = input.required<readonly NetworkNodeDto[]>();
  readonly edges = input.required<readonly NetworkEdgeDto[]>();
  readonly layout = input<'columnas' | 'estrella' | 'fuerza'>('columnas');

  readonly openNode = output<{ id: string; kind: 'proveedor' | 'asegurado' }>();

  protected readonly hoveredId = signal<string | null>(null);
  /** Sticky focus set by clicking a node — isolates its sub-network. */
  protected readonly focusId = signal<string | null>(null);

  /** Focus wins over hover for highlight/dim logic. */
  private readonly activeId = computed(() => this.focusId() ?? this.hoveredId());

  /** Top providers by alerts, then the insured each connects to (capped). */
  private readonly visible = computed(() => {
    const providers = this.nodes()
      .filter((n) => n.kind === 'proveedor')
      .sort((a, b) => b.alertas - a.alertas || b.casos - a.casos)
      .slice(0, MAX_PROVIDERS);
    const provIds = new Set(providers.map((p) => p.id));

    // Insured linked to a visible provider, ranked by total alerts on those links.
    const insuredAlertas = new Map<string, number>();
    for (const e of this.edges()) {
      if (!provIds.has(e.proveedor_id)) continue;
      insuredAlertas.set(e.asegurado_id, (insuredAlertas.get(e.asegurado_id) ?? 0) + e.alertas);
    }
    const insuredById = new Map(
      this.nodes().filter((n) => n.kind === 'asegurado').map((n) => [n.id, n]),
    );
    const insured = [...insuredAlertas.keys()]
      .map((id) => insuredById.get(id))
      .filter((n): n is NetworkNodeDto => n != null)
      .sort((a, b) => (insuredAlertas.get(b.id) ?? 0) - (insuredAlertas.get(a.id) ?? 0))
      .slice(0, MAX_INSURED);

    return { providers, insured };
  });

  protected readonly providerCount = computed(() => this.visible().providers.length);
  protected readonly insuredCount = computed(() => this.visible().insured.length);

  protected readonly canvasHeight = computed(() => {
    const rows = Math.max(this.visible().providers.length, this.visible().insured.length, 1);
    return Math.max(400, rows * 58 + 30);
  });

  /** Insured ordered by the average position of their providers (barycenter) — cuts crossings. */
  private readonly orderedInsured = computed<NetworkNodeDto[]>(() => {
    const { providers, insured } = this.visible();
    const provIndex = new Map(providers.map((p, i) => [p.id, i]));
    const bary = new Map<string, number>();
    for (const a of insured) {
      const ys: number[] = [];
      for (const e of this.edges()) {
        if (e.asegurado_id === a.id && provIndex.has(e.proveedor_id)) {
          ys.push(provIndex.get(e.proveedor_id)!);
        }
      }
      bary.set(a.id, ys.length ? ys.reduce((s, v) => s + v, 0) / ys.length : 0);
    }
    return [...insured].sort((a, b) => (bary.get(a.id) ?? 0) - (bary.get(b.id) ?? 0));
  });

  protected readonly placedNodes = computed<PlacedNode[]>(() => {
    switch (this.layout()) {
      case 'estrella':
        return this.placeRadial();
      case 'fuerza':
        return this.placeForce();
      default:
        return this.placeColumns();
    }
  });

  /**
   * Deterministic force-directed layout (Fruchterman–Reingold) — no dependency,
   * no live animation. Repulsion between all nodes + attraction along edges +
   * gravity to center, cooled over a fixed iteration count. Clusters and
   * collusion rings settle out on their own. Seeded on a circle so the result
   * is stable across renders.
   */
  private placeForce(): PlacedNode[] {
    const all = [...this.visible().providers, ...this.orderedInsured()];
    const n = all.length;
    if (n === 0) return [];
    const idx = new Map(all.map((node, i) => [node.id, i]));
    const pos = all.map((_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: 50 + 30 * Math.cos(a), y: 50 + 30 * Math.sin(a) };
    });
    const links: Array<[number, number]> = [];
    for (const e of this.edges()) {
      const s = idx.get(e.proveedor_id);
      const t = idx.get(e.asegurado_id);
      if (s != null && t != null) links.push([s, t]);
    }
    const k = Math.sqrt((100 * 100) / n) * 0.55; // ideal edge length
    let temp = 16;
    for (let it = 0; it < 340; it++) {
      const disp = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const rep = (k * k) / dist;
          disp[i].x += (dx / dist) * rep;
          disp[i].y += (dy / dist) * rep;
          disp[j].x -= (dx / dist) * rep;
          disp[j].y -= (dy / dist) * rep;
        }
      }
      for (const [s, t] of links) {
        const dx = pos[s].x - pos[t].x;
        const dy = pos[s].y - pos[t].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const att = (dist * dist) / k;
        disp[s].x -= (dx / dist) * att;
        disp[s].y -= (dy / dist) * att;
        disp[t].x += (dx / dist) * att;
        disp[t].y += (dy / dist) * att;
      }
      for (let i = 0; i < n; i++) {
        disp[i].x += (50 - pos[i].x) * 0.025;
        disp[i].y += (50 - pos[i].y) * 0.025;
        const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
        const m = Math.min(d, temp);
        pos[i].x += (disp[i].x / d) * m;
        pos[i].y += (disp[i].y / d) * m;
      }
      temp *= 0.985;
    }
    // Normalize into an 8..92 box so nodes never clip the edges.
    const xs = pos.map((p) => p.x);
    const ys = pos.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const sx = Math.max(...xs) - minX || 1;
    const sy = Math.max(...ys) - minY || 1;
    return all.map((node, i) =>
      this.toPlaced(node, 8 + ((pos[i].x - minX) / sx) * 84, 8 + ((pos[i].y - minY) / sy) * 84),
    );
  }

  private placeColumns(): PlacedNode[] {
    const providers = this.visible().providers;
    const insured = this.orderedInsured();
    const place = (list: NetworkNodeDto[], x: number): PlacedNode[] => {
      const n = list.length;
      return list.map((node, i) => this.toPlaced(node, x, n === 1 ? 50 : 7 + (i / (n - 1)) * 88));
    };
    return [...place(providers, PROV_X), ...place(insured, ASEG_X)];
  }

  /** Radial "star": providers on the left arc, insured on the right arc of one ring. */
  private placeRadial(): PlacedNode[] {
    const providers = this.visible().providers;
    const insured = this.orderedInsured();
    const R = 39;
    const arc = (list: NetworkNodeDto[], from: number, to: number): PlacedNode[] => {
      const n = list.length;
      return list.map((node, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = ((from + (to - from) * t) * Math.PI) / 180;
        return this.toPlaced(node, 50 + R * Math.cos(angle), 50 - R * Math.sin(angle));
      });
    };
    // Providers span the left semicircle (top→bottom), insured the right.
    return [...arc(providers, 110, 250), ...arc(insured, 70, -70)];
  }

  private toPlaced(node: NetworkNodeDto, x: number, y: number): PlacedNode {
    return {
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
      y,
      size: 44 + Math.min(16, Math.round(node.casos * 0.9)),
    };
  }

  protected readonly placedEdges = computed<PlacedEdge[]>(() => {
    const byId = new Map(this.placedNodes().map((n) => [n.id, n]));
    const mode = this.layout();
    const out: PlacedEdge[] = [];
    for (const e of this.edges()) {
      const p = byId.get(e.proveedor_id);
      const a = byId.get(e.asegurado_id);
      if (!p || !a) continue;
      let path: string;
      if (mode === 'fuerza') {
        path = `M ${p.x} ${p.y} L ${a.x} ${a.y}`;
      } else if (mode === 'estrella') {
        // Control point = midpoint pulled toward the center, bending each chord
        // inward so the links fan out like a star instead of a straight web.
        const midX = (p.x + a.x) / 2;
        const midY = (p.y + a.y) / 2;
        const cx = midX + (50 - midX) * 0.55;
        const cy = midY + (50 - midY) * 0.55;
        path = `M ${p.x} ${p.y} Q ${cx} ${cy} ${a.x} ${a.y}`;
      } else {
        const cx1 = p.x + (a.x - p.x) * 0.42;
        const cx2 = p.x + (a.x - p.x) * 0.58;
        path = `M ${p.x} ${p.y} C ${cx1} ${p.y} ${cx2} ${a.y} ${a.x} ${a.y}`;
      }
      out.push({
        id: `${e.proveedor_id}__${e.asegurado_id}`,
        path,
        risk: e.alertas > 0 ? (e.casos_compartidos >= 2 ? 'alert' : 'warn') : 'ok',
        width: Math.min(3.5, 0.8 + e.casos_compartidos * 0.6),
        provId: e.proveedor_id,
        asegId: e.asegurado_id,
      });
    }
    return out;
  });

  private readonly connectedIds = computed<Set<string>>(() => {
    const id = this.activeId();
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

  protected readonly focusedNode = computed<PlacedNode | null>(() => {
    const id = this.focusId();
    if (!id) return null;
    return this.placedNodes().find((n) => n.id === id) ?? null;
  });

  protected onNodeClick(n: PlacedNode, event: MouseEvent): void {
    // Stop the background handler (which clears focus) from firing.
    event.stopPropagation();
    this.focusId.update((cur) => (cur === n.id ? null : n.id));
  }

  protected isDimmed(id: string): boolean {
    const connected = this.connectedIds();
    return connected.size > 0 && !connected.has(id);
  }

  protected isFocused(id: string): boolean {
    return this.activeId() === id;
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
    const id = this.activeId();
    if (!id) return e.risk === 'alert' ? 0.4 : e.risk === 'warn' ? 0.32 : 0.16;
    return e.provId === id || e.asegId === id ? 0.9 : 0.04;
  }

  protected kindBadge(kind: 'proveedor' | 'asegurado'): string {
    return kind === 'proveedor'
      ? 'bg-brand-soft text-brand-ink border-[var(--brand)]'
      : 'bg-soft text-ink-2 border-line-2';
  }

  protected tooltipStyle(n: PlacedNode): Record<string, string> {
    const placeRight = n.x < 50;
    const key = placeRight ? 'left' : 'right';
    const value = placeRight ? `${n.x + 5}%` : `${100 - n.x + 5}%`;
    const vertical = n.y > 70 ? 'translateY(-100%)' : n.y < 25 ? 'translateY(0%)' : 'translateY(-50%)';
    return { [key]: value, top: `${n.y}%`, transform: vertical };
  }

  protected money(amount: number): string {
    return formatMoneyShort(amount);
  }
}

function shorten(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return name.length <= 18 ? name : `${name.slice(0, 16)}…`;
  return `${words[0]} ${words[1]}`;
}
