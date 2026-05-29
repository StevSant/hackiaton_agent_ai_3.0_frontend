import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import type { ClaimAlert } from '../models';
import { formatEvidence } from '../utils/evidence-format';
import { RuleCatalogStore } from '../services/rule-catalog.store';

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
      @if (meta(); as m) {
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line">
          <!-- Left: rule narrative (from backend catalog) -->
          <section class="px-5 py-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-mono text-[12px] px-2 py-0.5 rounded" [class]="tierPill(m.tier_hint)">
                {{ m.code }}
              </span>
              <span class="text-[11px] uppercase tracking-wider text-ink-3">Hasta {{ m.max_points }} pts</span>
            </div>
            <h4 class="text-[15px] font-semibold m-0 mb-2">{{ m.name }}</h4>
            <p class="text-[13px] text-ink-2 leading-relaxed m-0 mb-3">{{ m.short_description }}</p>

            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mt-4 mb-1.5">Qué activa la regla</div>
            <p class="text-[12.5px] text-ink-2 leading-relaxed m-0">{{ m.what_triggers }}</p>
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
                @if (isHardRule()) {
                  crítica
                } @else {
                  +{{ alert().puntos }} pts
                }
              </span>
            </div>

            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mb-2">
              Por qué se activó aquí
            </div>
            @if (evidenceRows().length > 0) {
              <dl class="space-y-1.5 m-0">
                @for (row of evidenceRows(); track row.label) {
                  <div class="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <dt class="text-ink-3">{{ row.label }}</dt>
                    <dd class="font-mono font-medium text-ink m-0">{{ row.value }}</dd>
                  </div>
                }
              </dl>
            } @else {
              <p class="text-[12.5px] text-ink-3 leading-relaxed m-0">
                Se activó por la condición de disparo de la regla; no expone variables
                numéricas adicionales para este caso.
              </p>
            }

            <div class="text-[11px] uppercase tracking-wider font-medium text-ink-3 mt-5 mb-2">
              Lectura del analista
            </div>
            <ul class="space-y-1.5 m-0 pl-0 list-none text-[12.5px] text-ink-2">
              <li class="flex items-start gap-2">
                <ui-icon name="info" [size]="14" />
                @if (isHardRule()) {
                  <span>Es una regla crítica: escala el caso directamente, sin sumar puntos al score.</span>
                } @else {
                  <span>La regla aporta {{ alert().puntos }} de un máximo de {{ m.max_points }} puntos.</span>
                }
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
      } @else if (catalog.loading()) {
        <div class="px-5 py-8 text-center text-ink-3 text-[13px]">Cargando descripción de la regla…</div>
      } @else {
        <div class="px-5 py-8 text-center text-ink-3 text-[13px]">
          No tenemos descripción detallada para {{ alert().code }} todavía.
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
  protected readonly catalog = inject(RuleCatalogStore);

  constructor() {
    effect(() => {
      if (this.open()) {
        void this.catalog.ensureLoaded();
      }
    });
  }

  protected readonly meta = computed(() => this.catalog.findByCode(this.alert().code));

  protected readonly evidenceRows = computed(() => formatEvidence(this.alert().evidence));

  // Hard rules (RF-*) carry 0 points — they escalate the tier directly.
  protected readonly isHardRule = computed(() => this.alert().puntos === 0);

  protected readonly title = computed(() => this.meta()?.name ?? this.alert().code);

  protected readonly subtitle = computed(() => {
    const m = this.meta();
    if (!m) return 'Detalle de la regla activada';
    return `${m.code} · Hasta ${m.max_points} puntos · Nivel ${m.tier_hint}`;
  });

  protected tierPill(c: 'rojo' | 'amarillo' | 'verde'): string {
    return TIER_PILL[c];
  }

  protected ptsPill(): string {
    return TIER_PILL[this.meta()?.tier_hint ?? 'amarillo'];
  }

  protected openCatalog(): void {
    void this.router.navigate(['/alerts']);
    this.close.emit();
  }
}
