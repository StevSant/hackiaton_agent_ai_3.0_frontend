import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Chip } from '../../../shared/ui/chip';
import { Icon } from '../../../shared/ui/icon';
import { ClaimsTable } from '../../claims/components/claims-table';
import type { Claim } from '../../claims/models';
import { ClaimsStore } from '../../claims/services/claims.store';
import type { RiskTier } from '../../../shared/utils';

type StatusFilter = 'todos' | 'pendiente' | 'escalado' | 'en_revision' | 'dictaminado' | 'revisado_sin_escalar';
type TierFilter = 'todos' | RiskTier;

@Component({
  selector: 'page-antifraude-investigacion',
  standalone: true,
  imports: [Chip, Icon, ClaimsTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Investigación</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Vista completa de todos los siniestros. Útil para cruzar patrones — proveedores, asegurados, ramos. <span class="text-ink-4">Lectura, sin acciones directas desde aquí.</span>
        </p>
      </div>
      <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-1.5 w-[300px] text-ink-3 text-[13px] shadow-1">
        <ui-icon name="search" [size]="16" />
        <input
          type="text"
          placeholder="Buscar por ID, asegurado, ciudad…"
          class="flex-1 border-0 outline-0 bg-transparent text-ink min-w-0"
          [value]="search()"
          (input)="onSearch($any($event.target).value)"
        />
      </div>
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line flex-wrap">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Todos los siniestros</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ filtered().length }} casos</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] uppercase tracking-wider text-ink-4 mr-1">Estado</span>
          <ui-chip [active]="status() === 'todos'" (click)="status.set('todos')">Todos</ui-chip>
          <ui-chip [active]="status() === 'pendiente'" (click)="status.set('pendiente')">Pendientes</ui-chip>
          <ui-chip [active]="status() === 'escalado'" (click)="status.set('escalado')">Escalados</ui-chip>
          <ui-chip [active]="status() === 'en_revision'" (click)="status.set('en_revision')">En revisión</ui-chip>
          <ui-chip [active]="status() === 'dictaminado'" (click)="status.set('dictaminado')">Dictaminados</ui-chip>
        </div>
      </div>
      <div class="flex items-center justify-end gap-1.5 px-5 py-2 border-b border-line bg-canvas/40">
        <span class="text-[11px] uppercase tracking-wider text-ink-4 mr-1">Riesgo</span>
        <ui-chip [active]="tier() === 'todos'" (click)="tier.set('todos')">Todos</ui-chip>
        <ui-chip [active]="tier() === 'rojo'" (click)="tier.set('rojo')">
          <span class="tier-dot tier-dot-r" style="box-shadow: none"></span> Alto
        </ui-chip>
        <ui-chip [active]="tier() === 'amarillo'" (click)="tier.set('amarillo')">
          <span class="tier-dot tier-dot-y" style="box-shadow: none"></span> Medio
        </ui-chip>
        <ui-chip [active]="tier() === 'verde'" (click)="tier.set('verde')">
          <span class="tier-dot tier-dot-g" style="box-shadow: none"></span> Bajo
        </ui-chip>
      </div>
      @if (filtered().length === 0) {
        <div class="px-5 py-12 text-center text-ink-3 text-[13px]">
          Sin casos con los filtros seleccionados.
        </div>
      } @else {
        <claims-table [claims]="filtered()" (open)="openCase($event)" />
      }
    </div>
  `,
})
export class InvestigacionPage {
  private readonly store = inject(ClaimsStore);
  private readonly router = inject(Router);

  protected readonly status = signal<StatusFilter>('todos');
  protected readonly tier = signal<TierFilter>('todos');
  protected readonly search = signal<string>('');

  protected readonly filtered = computed<Claim[]>(() => {
    const list = this.store.claims();
    const s = this.status();
    const t = this.tier();
    const q = this.search().toLowerCase().trim();
    return list
      .filter((c) => {
        if (s !== 'todos' && c.review.status !== s) return false;
        if (t !== 'todos' && c.nivel !== t) return false;
        if (q) {
          return (
            c.id.toLowerCase().includes(q) ||
            c.asegurado.toLowerCase().includes(q) ||
            c.cobertura.toLowerCase().includes(q) ||
            c.ciudad.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
  });

  protected onSearch(v: string): void {
    this.search.set(v);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}
