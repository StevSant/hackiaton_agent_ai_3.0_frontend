import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { Provider } from '../models';

type NodeKind = 'hub' | 'prov' | 'warn' | 'alert';

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

function shortenProviderName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return name.length <= 16 ? name : `${name.slice(0, 14)}…`;
  return `${words[0]} ${words[1]}`;
}

@Component({
  selector: 'network-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col h-full min-h-[420px]">
      <div class="flex-1 flex items-center justify-center px-4 py-5">
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
              [attr.title]="node.fullName"
              [attr.aria-label]="node.fullName"
              (mouseenter)="hoveredId.set(node.id)"
              (focus)="hoveredId.set(node.id)"
              (click)="selectedId.set(selectedId() === node.id ? null : node.id)"
            >
              <span class="px-1.5 text-center leading-tight" [style.fontSize.px]="nodeFontSize(node)">
                {{ node.label }}
              </span>
            </button>
          }
        </div>
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

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly selectedId = signal<string | null>(null);

  private readonly sortedProviders = computed(() =>
    [...this.providers()].sort((left, right) => right.alertas / right.casos - left.alertas / left.casos),
  );

  protected readonly selectedProvider = computed(() => {
    const selectedId = this.selectedId();
    if (!selectedId) return null;
    return this.providers().find((provider) => provider.id === selectedId) ?? null;
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

    const providerNodes = providerList.map((provider, index) => {
      const angle = (index / providerList.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 36;
      const alertRatio = provider.alertas / provider.casos;
      const riskKind: NodeKind = alertRatio > 0.4 ? 'alert' : alertRatio > 0.2 ? 'warn' : 'prov';

      return {
        id: provider.id,
        label: shortenProviderName(provider.nombre),
        fullName: provider.nombre,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        size: 48 + Math.min(18, Math.round(provider.casos * 1.4)),
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
}
