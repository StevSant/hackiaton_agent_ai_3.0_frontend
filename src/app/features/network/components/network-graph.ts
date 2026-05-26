import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Provider } from '../models';

type NodeKind = 'hub' | 'prov' | 'warn' | 'alert';

interface NodeView {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  kind: NodeKind;
  isHub: boolean;
}

function shorten(name: string): string {
  if (name.length <= 18) return name;
  return name.split(' ').slice(0, 2).join(' ');
}

@Component({
  selector: 'network-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative w-full h-[360px] overflow-hidden"
      style="background: radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--brand) 5%, transparent), transparent 65%), var(--bg-elev);"
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0">
        @for (n of edges(); track n.id) {
          <line
            x1="50"
            y1="50"
            [attr.x2]="n.x"
            [attr.y2]="n.y"
            [attr.stroke]="lineStroke(n.kind)"
            stroke-width="0.15"
            [attr.stroke-opacity]="lineOpacity(n.kind)"
            [attr.stroke-dasharray]="n.kind === 'alert' ? '0' : '.6 .6'"
          />
        }
      </svg>
      @for (n of nodes(); track n.id) {
        <div
          class="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full text-[10.5px] font-medium border-[1.5px] shadow-1 cursor-default transition-transform hover:scale-105"
          [class]="nodeClass(n)"
          [style.left.%]="n.x"
          [style.top.%]="n.y"
          [style.width.px]="n.size"
          [style.height.px]="n.size"
          [style.background]="n.isHub ? 'linear-gradient(135deg, var(--brand), var(--brand-2))' : null"
          [style.color]="n.isHub ? 'white' : null"
          [style.fontSize.px]="n.isHub ? 11 : 10"
          [attr.title]="n.label"
        >
          <span class="px-2 text-center leading-tight">{{ n.label }}</span>
        </div>
      }
    </div>
    <div class="flex items-center gap-3.5 px-5 py-3 text-[11.5px] text-ink-3">
      <span class="inline-flex items-center gap-1.5"><span class="tier-dot tier-dot-r" style="box-shadow: none"></span>Alto riesgo</span>
      <span class="inline-flex items-center gap-1.5"><span class="tier-dot tier-dot-y" style="box-shadow: none"></span>Medio</span>
      <span class="inline-flex items-center gap-1.5"><span class="tier-dot" style="background: var(--brand); box-shadow: none"></span>Estándar</span>
    </div>
  `,
})
export class NetworkGraph {
  readonly providers = input.required<readonly Provider[]>();

  private readonly sorted = computed(() =>
    [...this.providers()].sort((a, b) => b.alertas / b.casos - a.alertas / a.casos),
  );

  protected readonly nodes = computed<NodeView[]>(() => {
    const cx = 50;
    const cy = 50;
    const list = this.sorted();
    const hub: NodeView = { id: 'hub', label: 'Aseguradora', x: cx, y: cy, size: 64, kind: 'hub', isHub: true };
    const ring = list.map((p, i) => {
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const r = 35;
      const ratio = p.alertas / p.casos;
      const kind: NodeKind = ratio > 0.4 ? 'alert' : ratio > 0.2 ? 'warn' : 'prov';
      return {
        id: p.id,
        label: shorten(p.nombre),
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.85,
        size: 46 + Math.min(20, p.casos),
        kind,
        isHub: false,
      };
    });
    return [hub, ...ring];
  });

  protected readonly edges = computed(() => this.nodes().filter((n) => !n.isHub));

  protected lineStroke(kind: NodeKind): string {
    return kind === 'alert' ? 'var(--tier-red)' : kind === 'warn' ? 'var(--tier-yellow)' : 'var(--brand)';
  }

  protected lineOpacity(kind: NodeKind): number {
    return kind === 'alert' ? 0.5 : kind === 'warn' ? 0.4 : 0.25;
  }

  protected nodeClass(n: NodeView): string {
    if (n.isHub) return '';
    return n.kind === 'alert'
      ? 'border-[var(--tier-red)] bg-tier-red-soft text-tier-red-ink'
      : n.kind === 'warn'
        ? 'border-[var(--tier-yellow)] bg-tier-yellow-soft text-tier-yellow-ink'
        : 'border-[var(--brand)] bg-brand-soft text-brand-ink';
  }
}
