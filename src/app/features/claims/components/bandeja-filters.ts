import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';

import { Icon } from '@shared/ui/icon';

export type DateRangePreset = 'todos' | '7d' | '30d' | 'custom';

export interface BandejaFilterState {
  search: string;
  ramo: string;
  ciudad: string;
  datePreset: DateRangePreset;
  customFrom: string;
  customTo: string;
}

@Component({
  selector: 'claims-bandeja-filters',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Search -->
      <div class="flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-1.5 min-w-[200px] text-ink-3 text-[13px] shadow-1">
        <ui-icon name="search" [size]="16" />
        <input
          type="text"
          placeholder="Buscar por ID, asegurado, ciudad…"
          class="flex-1 border-0 outline-0 bg-transparent text-ink min-w-0"
          [value]="state().search"
          (input)="onSearchInput($any($event.target).value)"
        />
      </div>

      <!-- Ramo -->
      <select
        class="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-ink shadow-1 cursor-pointer"
        [value]="state().ramo"
        (change)="onRamo($any($event.target).value)"
      >
        <option value="">Todos los ramos</option>
        @for (r of ramos(); track r) {
          <option [value]="r">{{ r }}</option>
        }
      </select>

      <!-- Ciudad -->
      <select
        class="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-ink shadow-1 cursor-pointer"
        [value]="state().ciudad"
        (change)="onCiudad($any($event.target).value)"
      >
        <option value="">Todas las ciudades</option>
        @for (c of ciudades(); track c) {
          <option [value]="c">{{ c }}</option>
        }
      </select>

      <!-- Date range -->
      <select
        class="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-ink shadow-1 cursor-pointer"
        [value]="state().datePreset"
        (change)="onDatePreset($any($event.target).value)"
      >
        <option value="todos">Cualquier fecha</option>
        <option value="7d">Últimos 7 días</option>
        <option value="30d">Últimos 30 días</option>
        <option value="custom">Personalizado</option>
      </select>

      @if (state().datePreset === 'custom') {
        <input
          type="date"
          class="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-ink shadow-1"
          [value]="state().customFrom"
          (change)="onCustomFrom($any($event.target).value)"
        />
        <span class="text-[12px] text-ink-3">a</span>
        <input
          type="date"
          class="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-ink shadow-1"
          [value]="state().customTo"
          (change)="onCustomTo($any($event.target).value)"
        />
      }

      @if (hasActiveFilters()) {
        <button
          type="button"
          class="text-[12.5px] text-ink-3 hover:text-ink flex items-center gap-1 ml-1"
          (click)="resetFilters.emit()"
        >
          <ui-icon name="close" [size]="12" /> Limpiar
        </button>
      }
    </div>
  `,
})
export class BandejaFilters {
  readonly state = input.required<BandejaFilterState>();
  readonly ramos = input<readonly string[]>([]);
  readonly ciudades = input<readonly string[]>([]);

  readonly stateChange = output<Partial<BandejaFilterState>>();
  readonly resetFilters = output<void>();

  private _searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly hasActiveFilters = computed(() => {
    const s = this.state();
    return s.search || s.ramo || s.ciudad || s.datePreset !== 'todos';
  });

  protected onSearchInput(value: string): void {
    if (this._searchTimer !== null) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.stateChange.emit({ search: value });
    }, 150);
  }

  protected onRamo(value: string): void {
    this.stateChange.emit({ ramo: value });
  }

  protected onCiudad(value: string): void {
    this.stateChange.emit({ ciudad: value });
  }

  protected onDatePreset(value: string): void {
    this.stateChange.emit({ datePreset: value as DateRangePreset });
  }

  protected onCustomFrom(value: string): void {
    this.stateChange.emit({ customFrom: value });
  }

  protected onCustomTo(value: string): void {
    this.stateChange.emit({ customTo: value });
  }
}
