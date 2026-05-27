import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import type { ClaimAlert } from '../models';
import { RULE_NARRATIVES } from '../services/rule-narratives-mock';

const TIER_PILL: Record<'rojo' | 'amarillo' | 'verde', string> = {
  rojo: 'bg-tier-red-soft text-tier-red-ink',
  amarillo: 'bg-tier-yellow-soft text-tier-yellow-ink',
  verde: 'bg-tier-green-soft text-tier-green-ink',
};

@Component({
  selector: 'claim-rule-detail-dialog',
  standalone: true,
  imports: [Modal, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      [title]="title()"
      [subtitle]="subtitle()"
      size="lg"
      (close)="close.emit()"
    >
      @if (narrative(); as n) {
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line">
          <!-- Left: rule narrative -->
          <section class="px-5 py-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-mono text-[12px] px-2 py-0.5 rounded" [class]="tierPill(n.clasificacion)">
                {{ n.code }}
              </span>
              <span class="text-[11px] uppercase tracking-wider text-ink-3">Hasta {{ n.maxPts }} pts</span>
            </div>
            <h4 class="text-[15px] font-semibold m-0 mb-2">{{ n.titulo }}</h4>
            <p class="text-[13px] text-ink-2 leading-relaxed m-0 mb-3">{{ n.narrative }}</p>

            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mt-4 mb-1.5">Qué activa la regla</div>
            <ul class="space-y-1.5 m-0 pl-0 list-none">
              @for (t of n.whatTriggers; track $index) {
                <li class="flex items-start gap-2 text-[12.5px] text-ink-2">
                  <ui-icon name="check_small" [size]="14" />
                  <span>{{ t }}</span>
                </li>
              }
            </ul>
          </section>

          <!-- Right: this-claim evidence -->
          <section class="px-5 py-4 bg-canvas/50">
            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mb-2">
              En este caso
            </div>
            <div class="flex items-center gap-2 mb-3">
              <span class="font-mono text-[12px] px-2 py-0.5 rounded bg-soft text-ink-2">
                {{ alert().code }}
              </span>
              <span class="font-mono text-[12px] px-2 py-0.5 rounded" [class]="ptsPill()">
                +{{ alert().puntos }} pts
              </span>
            </div>
            <p class="text-[13px] text-ink leading-relaxed m-0">{{ alert().detalle }}</p>

            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mt-5 mb-2">
              Lectura del analista
            </div>
            <ul class="space-y-1.5 m-0 pl-0 list-none text-[12.5px] text-ink-2">
              <li class="flex items-start gap-2">
                <ui-icon name="info" [size]="14" />
                <span>La regla aporta {{ alert().puntos }} de un máximo de {{ n.maxPts }} puntos.</span>
              </li>
              <li class="flex items-start gap-2">
                <ui-icon name="info" [size]="14" />
                <span>Combínala con el resto de señales activadas antes de decidir.</span>
              </li>
              <li class="flex items-start gap-2">
                <ui-icon name="info" [size]="14" />
                <span>La activación nunca es una acusación — siempre requiere validación humana.</span>
              </li>
            </ul>
          </section>
        </div>
      } @else {
        <div class="px-5 py-8 text-center text-ink-3 text-[13px]">
          No tenemos descripción detallada para esta regla todavía.
        </div>
      }

      <div footer class="px-5 py-3.5 border-t border-line flex items-center justify-between gap-2 bg-surface">
        <ui-button variant="ghost" (click)="openCatalog()">
          <ui-icon name="open_in_new" [size]="14" />
          Ver en catálogo de reglas
        </ui-button>
        <ui-button (click)="close.emit()">Cerrar</ui-button>
      </div>
    </ui-modal>
  `,
})
export class RuleDetailDialog {
  readonly open = input.required<boolean>();
  readonly alert = input.required<ClaimAlert>();
  readonly close = output<void>();

  private readonly router = inject(Router);

  protected readonly narrative = computed(() => RULE_NARRATIVES[this.alert().code] ?? null);

  protected readonly title = computed(() => this.narrative()?.titulo ?? this.alert().code);

  protected readonly subtitle = computed(() => {
    const n = this.narrative();
    if (!n) return 'Detalle de la regla activada';
    return `${n.code} · Hasta ${n.maxPts} puntos · Nivel ${n.clasificacion}`;
  });

  protected tierPill(c: 'rojo' | 'amarillo' | 'verde'): string {
    return TIER_PILL[c];
  }

  protected ptsPill(): string {
    return TIER_PILL[this.narrative()?.clasificacion ?? 'amarillo'];
  }

  protected openCatalog(): void {
    void this.router.navigate(['/alerts']);
    this.close.emit();
  }
}
