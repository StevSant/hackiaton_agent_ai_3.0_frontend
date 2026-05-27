import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { formatMoneyShort, ramoLabel } from '@shared/utils';
import type { Provider } from '../models';

type NodeKind = 'hub' | 'prov' | 'warn' | 'alert';
type ProviderKind = Exclude<NodeKind, 'hub'>;
type ViewMode = 'ring' | 'grid';

interface NodeView {
  id: string;
  label: string;
  fullName: string;
  x: number;
  y: number;
  size: number;
  kind: NodeKind;
  isHub: boolean;
}

interface GridNodeView {
  id: string;
  label: string;
  size: number;
  kind: ProviderKind;
}

const TIER_BADGE: Record<ProviderKind, { label: string; cls: string }> = {
  alert: { label: 'Alto riesgo', cls: 'bg-tier-red-soft text-tier-red-ink border-[var(--tier-red)]' },
  warn: { label: 'Riesgo medio', cls: 'bg-tier-yellow-soft text-tier-yellow-ink border-[var(--tier-yellow)]' },
  prov: { label: 'Estándar', cls: 'bg-brand-soft text-brand-ink border-[var(--brand)]' },
};

const TIER_ORDER: Record<ProviderKind, number> = { alert: 0, warn: 1, prov: 2 };

function providerKind(p: Provider): ProviderKind {
  const ratio = p.casos > 0 ? p.alertas / p.casos : 0;
  return ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'prov';
}

function shortenProviderName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return name.length <= 16 ? name : `${name.slice(0, 14)}…`;
  return `${words[0]} ${words[1]}`;
}

function gridLabel(name: string): string {
  // Compact label for the grid view — small circles can't hold much text.
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].length <= 4 ? words[0].toUpperCase() : words[0].slice(0, 3).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

@Component({
  selector: 'network-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full min-h-[420px]">
      <div class="flex-1 flex items-center justify-center px-4 py-5">
        @if (viewMode() === 'grid') {
          <div
            class="network-grid-canvas relative w-full h-full overflow-auto"
            (mousemove)="onGridMouseMove($event)"
            (mouseleave)="onGridMouseLeave()"
          >
            <div class="flex flex-wrap items-start content-start justify-center gap-2 p-2">
              @for (g of gridNodes(); track g.id) {
                <button
                  type="button"
                  class="network-graph-node rounded-full border-2 grid place-items-center font-medium shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-transform hover:scale-110"
                  [class]="gridNodeClass(g)"
                  [class.network-graph-node-active]="isActive(g.id)"
                  [style.width.px]="g.size"
                  [style.height.px]="g.size"
                  [attr.aria-label]="providerLookup(g.id)?.nombre"
                  (mouseenter)="hoveredId.set(g.id)"
                  (focus)="hoveredId.set(g.id)"
                  (blur)="hoveredId.set(null)"
                  (click)="selectedId.set(selectedId() === g.id ? null : g.id)"
                >
                  <span class="text-[9px] leading-none text-center px-0.5">{{ g.label }}</span>
                </button>
              }
            </div>
            @if (hoveredProvider(); as hp) {
              <div
                class="network-graph-tooltip absolute z-30 pointer-events-none bg-surface border border-line rounded-lg shadow-pop p-3 w-[220px] max-w-[60vw]"
                [style]="gridTooltipStyle()"
              >
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <div class="text-[12.5px] font-semibold text-ink leading-tight">
                    {{ hp.nombre }}
                  </div>
                  <span
                    class="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border"
                    [class]="tierBadge(providerKindOf(hp)).cls"
                  >
                    {{ tierBadge(providerKindOf(hp)).label }}
                  </span>
                </div>
                <div class="text-[11px] text-ink-3 mb-2">{{ hp.tipo }} · {{ hp.ciudad }}</div>
                <div class="space-y-1 text-[11.5px]">
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Alertas</span>
                    <span class="font-semibold text-ink tabular-nums">
                      {{ hp.alertas }} / {{ hp.casos }}
                    </span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Concentración</span>
                    <span class="font-semibold text-ink tabular-nums">{{ ratioLabel(hp) }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Monto observado</span>
                    <span class="font-semibold text-ink tabular-nums">{{ moneyShort(hp.monto) }}</span>
                  </div>
                </div>
                @if (displayRamos(hp).length > 0) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (label of displayRamos(hp); track label) {
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-soft text-ink-2 border border-line">
                        {{ label }}
                      </span>
                    }
                  </div>
                }
                @if (hp.listaRestrictiva) {
                  <div class="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-tier-red-soft text-tier-red-ink border border-[var(--tier-red)]">
                    Lista restrictiva
                  </div>
                }
              </div>
            }
          </div>
        } @else {
        <div
          class="network-graph-canvas relative aspect-square w-full max-w-[440px]"
          (mouseleave)="hoveredId.set(null)"
        >
          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            @for (edge of edges(); track edge.id) {
              <line
                x1="50"
                y1="50"
                [attr.x2]="edge.x"
                [attr.y2]="edge.y"
                [attr.stroke]="lineStroke(edge.kind)"
                stroke-width="0.22"
                [attr.stroke-opacity]="lineOpacity(edge.kind)"
                [attr.stroke-dasharray]="edge.kind === 'alert' ? '0' : '1 1'"
                stroke-linecap="round"
              />
            }
          </svg>

          @for (node of nodes(); track node.id) {
            <button
              type="button"
              class="network-graph-node absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full border-2 font-medium shadow-sm transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              [class]="nodeClass(node)"
              [class.network-graph-node-active]="isActive(node.id)"
              [class.network-graph-node-pulse]="node.kind === 'alert' && !node.isHub"
              [style.left.%]="node.x"
              [style.top.%]="node.y"
              [style.width.px]="node.size"
              [style.height.px]="node.size"
              [style.background]="node.isHub ? 'linear-gradient(145deg, var(--brand), var(--brand-2))' : null"
              [style.color]="node.isHub ? 'white' : null"
              [attr.aria-label]="node.fullName"
              (mouseenter)="hoveredId.set(node.id)"
              (focus)="hoveredId.set(node.id)"
              (blur)="hoveredId.set(null)"
              (click)="selectedId.set(selectedId() === node.id ? null : node.id)"
            >
              <span class="px-1.5 text-center leading-tight" [style.fontSize.px]="nodeFontSize(node)">
                {{ node.label }}
              </span>
            </button>
          }

          @if (hoveredProvider(); as hp) {
            @if (ringTooltipStyle(); as style) {
              <div
                class="network-graph-tooltip absolute z-30 pointer-events-none bg-surface border border-line rounded-lg shadow-pop p-3 w-[220px] max-w-[60vw]"
                [style]="style"
              >
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <div class="text-[12.5px] font-semibold text-ink leading-tight">{{ hp.nombre }}</div>
                  <span
                    class="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border"
                    [class]="tierBadge(providerKindOf(hp)).cls"
                  >
                    {{ tierBadge(providerKindOf(hp)).label }}
                  </span>
                </div>
                <div class="text-[11px] text-ink-3 mb-2">{{ hp.tipo }} · {{ hp.ciudad }}</div>
                <div class="space-y-1 text-[11.5px]">
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Alertas</span>
                    <span class="font-semibold text-ink tabular-nums">
                      {{ hp.alertas }} / {{ hp.casos }}
                    </span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Concentración</span>
                    <span class="font-semibold text-ink tabular-nums">{{ ratioLabel(hp) }}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ink-3">Monto observado</span>
                    <span class="font-semibold text-ink tabular-nums">{{ moneyShort(hp.monto) }}</span>
                  </div>
                </div>
                @if (displayRamos(hp).length > 0) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (label of displayRamos(hp); track label) {
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-soft text-ink-2 border border-line">
                        {{ label }}
                      </span>
                    }
                  </div>
                }
                @if (hp.listaRestrictiva) {
                  <div class="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-tier-red-soft text-tier-red-ink border border-[var(--tier-red)]">
                    Lista restrictiva
                  </div>
                }
              </div>
            }
          }
        </div>
        }
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-line text-[11.5px] text-ink-3">
        <div class="flex flex-wrap items-center gap-3.5">
          <span class="inline-flex items-center gap-1.5">
            <span class="tier-dot tier-dot-r" style="box-shadow: none"></span>
            Alto riesgo
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="tier-dot tier-dot-y" style="box-shadow: none"></span>
            Medio
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="tier-dot" style="background: var(--brand); box-shadow: none"></span>
            Estándar
          </span>
        </div>
        @if (selectedProvider(); as provider) {
          <span class="text-[11px] text-ink-2 truncate max-w-[240px]">
            {{ provider.nombre }} · {{ provider.alertas }}/{{ provider.casos }} alertas
          </span>
        }
      </div>
    </div>
  `,
})
export class NetworkGraph {
  readonly providers = input.required<readonly Provider[]>();
  readonly viewMode = input<ViewMode>('ring');

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly mousePos = signal<{ x: number; y: number } | null>(null);

  private readonly sortedProviders = computed(() =>
    [...this.providers()].sort((left, right) => right.alertas / right.casos - left.alertas / left.casos),
  );

  protected readonly selectedProvider = computed(() => {
    const selectedId = this.selectedId();
    if (!selectedId) return null;
    return this.providers().find((provider) => provider.id === selectedId) ?? null;
  });

  /** Provider currently hovered (or null) — shared by ring + grid tooltips. */
  protected readonly hoveredProvider = computed<Provider | null>(() => {
    const hoveredId = this.hoveredId();
    if (!hoveredId || hoveredId === 'hub') return null;
    return this.providers().find((p) => p.id === hoveredId) ?? null;
  });

  protected readonly gridNodes = computed<GridNodeView[]>(() => {
    // Cluster by tier (reds, then yellows, then standards) so the user sees
    // the risk distribution at a glance. Within each tier, biggest alert
    // counts first.
    const list = [...this.providers()].sort((a, b) => {
      const order = TIER_ORDER[providerKind(a)] - TIER_ORDER[providerKind(b)];
      if (order !== 0) return order;
      return b.alertas - a.alertas || b.casos - a.casos;
    });
    return list.map((p) => ({
      id: p.id,
      label: gridLabel(p.nombre),
      size: 28 + Math.min(20, Math.round(p.casos * 1.2)),
      kind: providerKind(p),
    }));
  });

  protected readonly nodes = computed<NodeView[]>(() => {
    const centerX = 50;
    const centerY = 50;
    const providerList = this.sortedProviders();
    const hubNode: NodeView = {
      id: 'hub',
      label: 'Asegurado',
      fullName: 'Red central de asegurados',
      x: centerX,
      y: centerY,
      size: 72,
      kind: 'hub',
      isHub: true,
    };

    // Adapt node size + ring radius to provider count so 5 vs 15 nodes both
    // look balanced (small ring + big nodes vs large ring + smaller nodes).
    const count = providerList.length || 1;
    const radius = count <= 6 ? 30 : count <= 10 ? 34 : 38;
    const sizeBase = count <= 6 ? 56 : count <= 10 ? 50 : 44;
    const sizeBonus = count <= 6 ? 22 : count <= 10 ? 16 : 12;

    const providerNodes = providerList.map((provider, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const ratio = provider.casos > 0 ? provider.alertas / provider.casos : 0;
      const riskKind: NodeKind = ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'prov';

      return {
        id: provider.id,
        label: shortenProviderName(provider.nombre),
        fullName: provider.nombre,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        size: sizeBase + Math.min(sizeBonus, Math.round(provider.casos * 1.4)),
        kind: riskKind,
        isHub: false,
      };
    });

    return [hubNode, ...providerNodes];
  });

  protected readonly edges = computed(() => {
    const activeId = this.activeNodeId();
    return this.nodes()
      .filter((node) => !node.isHub)
      .map((node) => ({
        ...node,
        highlighted: activeId === null || activeId === node.id || activeId === 'hub',
      }));
  });

  protected isActive(nodeId: string): boolean {
    const activeId = this.activeNodeId();
    return activeId === null || activeId === nodeId;
  }

  protected nodeFontSize(node: NodeView): number {
    if (node.isHub) return 11;
    return node.size >= 58 ? 10 : 9;
  }

  protected lineStroke(kind: NodeKind): string {
    return kind === 'alert' ? 'var(--tier-red)' : kind === 'warn' ? 'var(--tier-yellow)' : 'var(--brand)';
  }

  protected lineOpacity(kind: NodeKind): number {
    const activeId = this.activeNodeId();
    const baseOpacity = kind === 'alert' ? 0.55 : kind === 'warn' ? 0.45 : 0.3;
    return activeId === null ? baseOpacity : baseOpacity + 0.15;
  }

  protected nodeClass(node: NodeView): string {
    if (node.isHub) return 'border-white/30 text-white z-20';
    return node.kind === 'alert'
      ? 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink z-10'
      : node.kind === 'warn'
        ? 'border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink z-10'
        : 'border-[var(--brand)] bg-brand-soft text-brand-ink z-10';
  }

  private activeNodeId(): string | null {
    return this.selectedId() ?? this.hoveredId();
  }

  /** Position for the ring-mode tooltip — returns null when no valid hovered ring node. */
  protected ringTooltipStyle(): Record<string, string> | null {
    const id = this.hoveredId();
    if (!id || id === 'hub') return null;
    const node = this.nodes().find((n) => n.id === id && !n.isHub);
    if (!node) return null;
    // Hang the card off whichever side has more room so it doesn't push past
    // the square canvas edges; anchor vertically to the node and translate to
    // keep it inside the bounds.
    const placeRight = node.x < 50;
    const horizontalKey = placeRight ? 'left' : 'right';
    const horizontalValue = placeRight ? `${node.x + 8}%` : `${100 - node.x + 8}%`;
    const verticalTransform =
      node.y > 70 ? 'translateY(-100%)' : node.y < 30 ? 'translateY(0%)' : 'translateY(-50%)';
    return {
      [horizontalKey]: horizontalValue,
      top: `${node.y}%`,
      transform: verticalTransform,
    };
  }

  /** Mouse-tracked position for the grid-mode tooltip. */
  protected gridTooltipStyle(): Record<string, string> {
    const pos = this.mousePos();
    if (!pos) return { display: 'none' };
    // 220px-wide card; flip to the left side of the cursor when near the
    // right edge so it doesn't get clipped.
    const flipLeft = pos.x > 260;
    const horizontalKey = flipLeft ? 'right' : 'left';
    const horizontalValue = flipLeft ? '0px' : `${pos.x + 14}px`;
    return {
      [horizontalKey]: horizontalValue,
      top: `${pos.y + 14}px`,
    };
  }

  protected onGridMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.mousePos.set({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  protected onGridMouseLeave(): void {
    this.hoveredId.set(null);
    this.mousePos.set(null);
  }

  protected gridNodeClass(node: GridNodeView): string {
    return node.kind === 'alert'
      ? 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink'
      : node.kind === 'warn'
        ? 'border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink'
        : 'border-[var(--brand)] bg-brand-soft text-brand-ink';
  }

  protected providerLookup(id: string): Provider | undefined {
    return this.providers().find((p) => p.id === id);
  }

  protected providerKindOf(provider: Provider): ProviderKind {
    return providerKind(provider);
  }

  protected ratioLabel(provider: Provider): string {
    if (provider.casos === 0) return 'sin datos';
    return `${Math.round((provider.alertas / provider.casos) * 100)}%`;
  }

  protected moneyShort(amount: number): string {
    return formatMoneyShort(amount);
  }

  protected displayRamos(provider: Provider): string[] {
    return provider.ramos.slice(0, 3).map((r) => ramoLabel(r));
  }

  protected tierBadge(kind: ProviderKind): { label: string; cls: string } {
    return TIER_BADGE[kind];
  }
}
