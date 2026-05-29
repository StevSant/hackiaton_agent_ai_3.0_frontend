import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import { formatMoneyShort } from '@shared/utils';
import type { NetworkNodeDto, NetworkNodeKind } from '@core/api/clients/network.api';
import type { ColumnSpec, GraphEdge } from '../models';

type Risk = 'alert' | 'warn' | 'ok';

interface PlacedNode {
  id: string;
  label: string;
  kind: NetworkNodeKind;
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
  source: string;
  target: string;
}

/** Per-column node caps, keyed by kind. Force needs more breathing room. */
function capFor(kind: NetworkNodeKind, layout: string): number {
  const force = layout === 'fuerza';
  if (kind === 'caso') return force ? 12 : 16;
  if (kind === 'proveedor') return force ? 6 : 8;
  return force ? 8 : 12; // asegurado
}

function riskFromRatio(alertas: number, casos: number): Risk {
  const ratio = casos > 0 ? alertas / casos : 0;
  return ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'ok';
}

function riskFromTier(tier: string | undefined): Risk | null {
  if (tier === 'rojo') return 'alert';
  if (tier === 'amarillo') return 'warn';
  if (tier === 'verde') return 'ok';
  return null;
}

const KIND_LABEL: Record<NetworkNodeKind, string> = {
  proveedor: 'Proveedor',
  asegurado: 'Asegurado',
  caso: 'Caso',
};

/**
 * Column-based relationship graph. Driven by a `columns` descriptor so it can
 * render bipartite views (provider↔insured, provider↔caso, insured↔caso) and
 * the tripartite provider—caso—insured chain with the same code. Nodes are
 * placed left→right by their kind's column; the leftmost column is capped by
 * alert weight and each following column keeps the nodes connected to the
 * already-visible ones. Columnas / Estrella / Fuerza re-arrange the same set.
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
          No hay relaciones para los filtros actuales.
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
              @for (col of columns(); track col.kind) {
                <div
                  class="absolute top-0 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                  [class]="col.kind === 'proveedor' ? 'text-brand-ink' : 'text-ink-3'"
                  [style.left.%]="col.x"
                  [style.transform]="'translateX(-50%)'"
                >
                  {{ col.label }}
                </div>
              }
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
                    {{ kindLabel(hn.kind) }}
                  </span>
                </div>
                <div class="text-[11px] text-ink-3 mb-2">{{ hn.ciudad }}</div>
                <div class="space-y-1 text-[11.5px]">
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">{{ hn.kind === 'caso' ? 'Estado' : 'Alertas' }}</span>
                    <span class="font-semibold text-ink tabular-nums">
                      {{ hn.kind === 'caso' ? riskLabel(hn.risk) : hn.alertas + ' / ' + hn.casos }}
                    </span>
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
        <span class="text-[11px] text-ink-2">{{ summary() }}</span>
      </div>
    </div>
  `,
})
export class NetworkGraph {
  readonly nodes = input.required<readonly NetworkNodeDto[]>();
  readonly edges = input.required<readonly GraphEdge[]>();
  readonly columns = input.required<readonly ColumnSpec[]>();
  readonly layout = input<'columnas' | 'estrella' | 'fuerza'>('columnas');

  readonly openNode = output<{ id: string; kind: NetworkNodeKind }>();

  protected readonly hoveredId = signal<string | null>(null);
  /** Sticky focus set by clicking a node — isolates its sub-network. */
  protected readonly focusId = signal<string | null>(null);

  /** Focus wins over hover for highlight/dim logic. */
  private readonly activeId = computed(() => this.focusId() ?? this.hoveredId());

  private nodeById = computed(() => new Map(this.nodes().map((n) => [n.id, n])));

  /** Capped node set, walked left→right keeping each column connected. */
  private readonly visibleColumns = computed<NetworkNodeDto[][]>(() => {
    const cols = this.columns();
    const layout = this.layout();
    const grouped: NetworkNodeDto[][] = cols.map(() => []);
    for (const n of this.nodes()) {
      const ci = cols.findIndex((c) => c.kind === n.kind);
      if (ci >= 0) grouped[ci].push(n);
    }
    const byAlerts = (a: NetworkNodeDto, b: NetworkNodeDto): number =>
      b.alertas - a.alertas || b.casos - a.casos;

    const visible: NetworkNodeDto[][] = [];
    const seen: Set<string>[] = [];
    const first = [...grouped[0]].sort(byAlerts).slice(0, capFor(cols[0].kind, layout));
    visible.push(first);
    seen.push(new Set(first.map((n) => n.id)));

    for (let k = 1; k < cols.length; k++) {
      const prev = seen[k - 1];
      const connected = grouped[k].filter((n) =>
        this.edges().some(
          (e) =>
            (e.source === n.id && prev.has(e.target)) ||
            (e.target === n.id && prev.has(e.source)),
        ),
      );
      const sel = connected.sort(byAlerts).slice(0, capFor(cols[k].kind, layout));
      visible.push(sel);
      seen.push(new Set(sel.map((n) => n.id)));
    }
    return visible;
  });

  private readonly visibleIds = computed<Set<string>>(
    () => new Set(this.visibleColumns().flat().map((n) => n.id)),
  );

  protected readonly canvasHeight = computed(() => {
    const rows = Math.max(...this.visibleColumns().map((c) => c.length), 1);
    return Math.max(400, rows * 58 + 30);
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

  /** Order a column by the average position of its neighbors in the prior one. */
  private orderByBarycenter(
    list: NetworkNodeDto[],
    prevOrder: Map<string, number>,
  ): NetworkNodeDto[] {
    const bary = new Map<string, number>();
    for (const n of list) {
      const ys: number[] = [];
      for (const e of this.edges()) {
        if (e.source === n.id && prevOrder.has(e.target)) ys.push(prevOrder.get(e.target)!);
        if (e.target === n.id && prevOrder.has(e.source)) ys.push(prevOrder.get(e.source)!);
      }
      bary.set(n.id, ys.length ? ys.reduce((s, v) => s + v, 0) / ys.length : 0);
    }
    return [...list].sort((a, b) => (bary.get(a.id) ?? 0) - (bary.get(b.id) ?? 0));
  }

  private placeColumns(): PlacedNode[] {
    const cols = this.columns();
    const visible = this.visibleColumns();
    const result: PlacedNode[] = [];
    let prevOrder: Map<string, number> | null = null;
    for (let k = 0; k < cols.length; k++) {
      let list = visible[k];
      if (k > 0 && prevOrder) list = this.orderByBarycenter(list, prevOrder);
      const n = list.length;
      list.forEach((node, i) =>
        result.push(this.toPlaced(node, cols[k].x, n === 1 ? 50 : 7 + (i / (n - 1)) * 88)),
      );
      prevOrder = new Map(list.map((node, i) => [node.id, i]));
    }
    return result;
  }

  /** Radial: first column on the left arc, last on the right arc, middle vertical. */
  private placeRadial(): PlacedNode[] {
    const cols = this.columns();
    const visible = this.visibleColumns();
    const R = 39;
    const arc = (list: NetworkNodeDto[], from: number, to: number): PlacedNode[] => {
      const n = list.length;
      return list.map((node, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = ((from + (to - from) * t) * Math.PI) / 180;
        return this.toPlaced(node, 50 + R * Math.cos(angle), 50 - R * Math.sin(angle));
      });
    };
    const vertical = (list: NetworkNodeDto[]): PlacedNode[] => {
      const n = list.length;
      return list.map((node, i) =>
        this.toPlaced(node, 50, n === 1 ? 50 : 10 + (i / (n - 1)) * 80),
      );
    };
    const out: PlacedNode[] = [];
    const last = cols.length - 1;
    out.push(...arc(visible[0], 110, 250));
    out.push(...arc(visible[last], 70, -70));
    for (let k = 1; k < last; k++) out.push(...vertical(visible[k]));
    return out;
  }

  /**
   * Deterministic force-directed layout (Fruchterman–Reingold) — no dependency,
   * no live animation. Repulsion + edge attraction + gravity, cooled over a
   * fixed iteration count, then a collision-resolution pass so nodes never
   * overlap. Seeded on a circle so the result is stable across renders.
   */
  private placeForce(): PlacedNode[] {
    const all = this.visibleColumns().flat();
    const n = all.length;
    if (n === 0) return [];
    const idx = new Map(all.map((node, i) => [node.id, i]));
    const pos = all.map((_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: 50 + 30 * Math.cos(a), y: 50 + 30 * Math.sin(a) };
    });
    const links: Array<[number, number]> = [];
    for (const e of this.edges()) {
      const s = idx.get(e.source);
      const t = idx.get(e.target);
      if (s != null && t != null) links.push([s, t]);
    }
    const k = Math.max(20, Math.sqrt((100 * 100) / n) * 0.9);
    let temp = 18;
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
    const xs = pos.map((p) => p.x);
    const ys = pos.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const sx = Math.max(...xs) - minX || 1;
    const sy = Math.max(...ys) - minY || 1;
    const norm = pos.map((p) => ({ x: 8 + ((p.x - minX) / sx) * 84, y: 8 + ((p.y - minY) / sy) * 84 }));

    const radius = all.map((node) => this.nodeSize(node) / 2 / 5.2);
    for (let pass = 0; pass < 30; pass++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = norm[i].x - norm[j].x;
          const dy = norm[i].y - norm[j].y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const minD = radius[i] + radius[j] + 2.5;
          if (dist < minD) {
            const push = (minD - dist) / 2;
            norm[i].x += (dx / dist) * push;
            norm[i].y += (dy / dist) * push;
            norm[j].x -= (dx / dist) * push;
            norm[j].y -= (dy / dist) * push;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        norm[i].x = Math.min(94, Math.max(6, norm[i].x));
        norm[i].y = Math.min(94, Math.max(6, norm[i].y));
      }
    }
    return all.map((node, i) => this.toPlaced(node, norm[i].x, norm[i].y));
  }

  private nodeSize(node: NetworkNodeDto): number {
    if (node.kind === 'caso') return 38;
    return 44 + Math.min(16, Math.round(node.casos * 0.9));
  }

  private nodeRisk(node: NetworkNodeDto): Risk {
    return riskFromTier(node.tier) ?? riskFromRatio(node.alertas, node.casos);
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
      risk: this.nodeRisk(node),
      x,
      y,
      size: this.nodeSize(node),
    };
  }

  protected readonly placedEdges = computed<PlacedEdge[]>(() => {
    const byId = new Map(this.placedNodes().map((n) => [n.id, n]));
    const mode = this.layout();
    const out: PlacedEdge[] = [];
    for (const e of this.edges()) {
      const p = byId.get(e.source);
      const a = byId.get(e.target);
      if (!p || !a) continue;
      // Order endpoints left→right so the bezier control points read correctly.
      const left = p.x <= a.x ? p : a;
      const right = p.x <= a.x ? a : p;
      let path: string;
      if (mode === 'fuerza') {
        path = `M ${p.x} ${p.y} L ${a.x} ${a.y}`;
      } else if (mode === 'estrella') {
        const midX = (p.x + a.x) / 2;
        const midY = (p.y + a.y) / 2;
        const cx = midX + (50 - midX) * 0.55;
        const cy = midY + (50 - midY) * 0.55;
        path = `M ${p.x} ${p.y} Q ${cx} ${cy} ${a.x} ${a.y}`;
      } else {
        const cx1 = left.x + (right.x - left.x) * 0.42;
        const cx2 = left.x + (right.x - left.x) * 0.58;
        path = `M ${left.x} ${left.y} C ${cx1} ${left.y} ${cx2} ${right.y} ${right.x} ${right.y}`;
      }
      out.push({
        id: `${e.source}__${e.target}`,
        path,
        risk: e.alertas > 0 ? (e.casos >= 2 ? 'alert' : 'warn') : 'ok',
        width: Math.min(3.5, 0.8 + e.casos * 0.6),
        source: e.source,
        target: e.target,
      });
    }
    return out;
  });

  private readonly connectedIds = computed<Set<string>>(() => {
    const id = this.activeId();
    if (!id) return new Set();
    const set = new Set<string>([id]);
    for (const e of this.placedEdges()) {
      if (e.source === id) set.add(e.target);
      if (e.target === id) set.add(e.source);
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

  protected readonly summary = computed(() => {
    const cols = this.columns();
    const visible = this.visibleColumns();
    const parts = cols.map((c, i) => `${visible[i].length} ${c.label.toLowerCase()}`);
    return `${parts.join(' · ')} · ${this.placedEdges().length} vínculos`;
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
    return this.placedEdges().filter((e) => e.source === id || e.target === id).length;
  }

  protected kindLabel(kind: NetworkNodeKind): string {
    return KIND_LABEL[kind];
  }

  protected riskLabel(risk: Risk): string {
    return risk === 'alert' ? 'Rojo' : risk === 'warn' ? 'Amarillo' : 'Verde';
  }

  protected nodeClass(n: PlacedNode): string {
    if (n.risk === 'alert') return 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink z-10';
    if (n.risk === 'warn') return 'border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink z-10';
    return n.kind === 'asegurado'
      ? 'border-line-2 bg-soft text-ink-2 z-10'
      : 'border-[var(--brand)] bg-brand-soft text-brand-ink z-10';
  }

  protected edgeStroke(risk: Risk): string {
    return risk === 'alert' ? 'var(--tier-red)' : risk === 'warn' ? 'var(--tier-yellow)' : 'var(--brand)';
  }

  protected edgeOpacity(e: PlacedEdge): number {
    const id = this.activeId();
    if (!id) return e.risk === 'alert' ? 0.4 : e.risk === 'warn' ? 0.32 : 0.16;
    return e.source === id || e.target === id ? 0.9 : 0.04;
  }

  protected kindBadge(kind: NetworkNodeKind): string {
    if (kind === 'proveedor') return 'bg-brand-soft text-brand-ink border-[var(--brand)]';
    if (kind === 'caso') return 'bg-tier-yellow-soft text-tier-yellow-ink border-[var(--tier-yellow)]';
    return 'bg-soft text-ink-2 border-line-2';
  }

  protected tooltipStyle(n: PlacedNode): Record<string, string> {
    const placeRight = n.x < 50;
    const key = placeRight ? 'left' : 'right';
    const value = placeRight ? `${n.x + 5}%` : `${100 - n.x + 5}%`;
    const v = n.y > 70 ? 'translateY(-100%)' : n.y < 25 ? 'translateY(0%)' : 'translateY(-50%)';
    return { [key]: value, top: `${n.y}%`, transform: v };
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
