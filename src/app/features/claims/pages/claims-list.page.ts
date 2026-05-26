import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '../../../shared/ui/button';
import { Chip } from '../../../shared/ui/chip';
import { Icon } from '../../../shared/ui/icon';
import { KpiCard } from '../../../shared/ui/kpi-card';
import { StackChart } from '../../../shared/ui/stack-chart';
import { ClaimsTable } from '../components/claims-table';
import { PatternsCard } from '../components/patterns-card';
import { ClaimsStore } from '../services/claims.store';
import type { RiskTier } from '../../../shared/utils';

type Filter = 'todos' | RiskTier;

@Component({
  selector: 'page-claims-list',
  standalone: true,
  imports: [Button, Chip, Icon, KpiCard, StackChart, ClaimsTable, PatternsCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-end justify-between gap-6 py-2 pb-6">
      <div>
        <h1 class="text-[26px] font-semibold tracking-tight m-0 mb-1">Hola, Lucía</h1>
        <p class="text-ink-3 text-[13.5px] m-0">
          Tu bandeja tiene <b class="text-tier-red-ink">{{ stats().r }} casos críticos</b> y {{ stats().y }} medios para revisar hoy.
        </p>
      </div>
      <div class="flex gap-2">
        <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-1.5 w-[280px] text-ink-3 text-[13px] shadow-1">
          <ui-icon name="search" [size]="16" />
          <input
            type="text"
            placeholder="Buscar por ID, asegurado, ciudad…"
            class="flex-1 border-0 outline-0 bg-transparent text-ink min-w-0"
            [value]="search()"
            (input)="onSearch($any($event.target).value)"
          />
          <kbd class="text-[10.5px] text-ink-4 border border-line px-1.5 py-px rounded bg-canvas font-sans">⌘K</kbd>
        </div>
        <ui-button>
          <ui-icon name="download" [size]="14" />
          Exportar
        </ui-button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-3 mb-5">
      <ui-kpi-card
        label="Casos en bandeja"
        [value]="stats().total"
        [delta]="{ up: true, text: '+8 esta semana' }"
        [spark]="[34, 40, 33, 46, 49, 42, 37, 45, 50, 47, 54, 52]"
        color="var(--brand)"
      />
      <ui-kpi-card
        label="Score promedio"
        [value]="stats().avg"
        suffix=" / 100"
        [delta]="{ up: true, text: '+3.2 vs semana anterior', isBad: true }"
        [spark]="[36, 38, 37, 39, 42, 41, 40, 43, 44, 46, 45, 47]"
        color="var(--tier-yellow)"
      />
      <ui-kpi-card
        label="Alertas críticas"
        [value]="stats().r"
        suffix=" rojos"
        [delta]="{ up: true, text: '+2 hoy', isBad: true }"
        [spark]="[2, 4, 3, 6, 5, 7, 8, 6, 9, 11, 8, 12]"
        color="var(--tier-red)"
      />
      <ui-kpi-card
        label="Exposición en revisión"
        [value]="exposureValue()"
        [delta]="{ up: false, text: 'Sobre $0.7M total bandeja' }"
        [spark]="[120, 140, 135, 155, 160, 145, 170, 165, 180, 175, 190, 205]"
        color="var(--brand-2)"
      />
    </div>

    <div class="grid grid-cols-[1.7fr_1fr] gap-5 mb-5">
      <div class="bg-surface border border-line rounded-lg shadow-1">
        <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <div>
            <h3 class="text-[13px] font-semibold m-0">Casos por nivel de riesgo</h3>
            <div class="text-[12px] text-ink-3 mt-0.5">Últimas 12 semanas · vista apilada</div>
          </div>
          <div class="flex gap-1.5">
            <ui-chip [active]="true">12s</ui-chip>
            <ui-chip>30d</ui-chip>
            <ui-chip>90d</ui-chip>
          </div>
        </div>
        <ui-stack-chart [data]="trend()" />
      </div>
      <claims-patterns-card />
    </div>

    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div class="flex items-center gap-3.5">
          <h3 class="text-[13px] font-semibold m-0">Bandeja de siniestros</h3>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] bg-soft text-ink-2 border border-line">{{ filtered().length }} casos</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <ui-chip [active]="filter() === 'todos'" (click)="filter.set('todos')">Todos</ui-chip>
          <ui-chip [active]="filter() === 'rojo'" (click)="filter.set('rojo')">
            <span class="tier-dot tier-dot-r" style="box-shadow: none"></span> Alto ({{ stats().r }})
          </ui-chip>
          <ui-chip [active]="filter() === 'amarillo'" (click)="filter.set('amarillo')">
            <span class="tier-dot tier-dot-y" style="box-shadow: none"></span> Medio ({{ stats().y }})
          </ui-chip>
          <ui-chip [active]="filter() === 'verde'" (click)="filter.set('verde')">
            <span class="tier-dot tier-dot-g" style="box-shadow: none"></span> Bajo ({{ stats().g }})
          </ui-chip>
        </div>
      </div>
      <claims-table [claims]="filtered()" (open)="openCase($event)" />
    </div>
  `,
})
export class ClaimsListPage {
  private readonly store = inject(ClaimsStore);
  private readonly router = inject(Router);

  protected readonly stats = this.store.stats;
  protected readonly trend = this.store.trend;
  protected readonly filter = signal<Filter>('todos');
  protected readonly search = signal<string>('');

  protected readonly filtered = computed(() => {
    const list = this.store.claims();
    const f = this.filter();
    const q = this.search().toLowerCase().trim();
    return list
      .filter((c) => {
        if (f !== 'todos' && c.nivel !== f) return false;
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

  protected readonly exposureValue = computed(() => {
    const e = this.stats().expuesto;
    return `$${(e / 1000).toFixed(0)}K`;
  });

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected openCase(id: string): void {
    void this.router.navigate(['/claims', id]);
  }
}
