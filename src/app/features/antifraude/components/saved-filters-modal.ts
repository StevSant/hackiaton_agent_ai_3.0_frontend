import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import {
  EMPTY_INVESTIGATION_FILTERS,
  type InvestigationFilters,
} from '../utils/investigation-filters';
import {
  deleteSavedFilter,
  loadSavedFilters,
  saveSavedFilter,
  type SavedFilter,
} from '../utils/saved-filters-storage';

@Component({
  selector: 'antifraude-saved-filters-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Filtros guardados"
      subtitle="Guarda combinaciones de filtros para reutilizarlas más tarde."
      size="md"
      (close)="close.emit()"
    >
      <div class="px-5 py-5 flex flex-col gap-5">
        <div>
          <label
            class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2"
          >
            Guardar filtros actuales
          </label>
          @if (canSaveCurrent()) {
            <div class="flex items-center gap-2">
              <input
                type="text"
                class="flex-1 bg-surface border border-line rounded-sm px-3 py-2 text-[13.5px] focus:border-brand focus:ring-2 focus:ring-brand-soft focus:outline-none"
                placeholder="Ej. Quito · alto riesgo · pendientes"
                [value]="newName()"
                (input)="newName.set($any($event.target).value)"
                (keydown.enter)="onSave()"
              />
              <ui-button variant="primary" [disabled]="!canSubmit()" (click)="onSave()">
                <ui-icon name="bookmark_add" [size]="14" />
                Guardar
              </ui-button>
            </div>
            @if (duplicateWarning()) {
              <p class="text-[11.5px] text-tier-yellow-ink mt-1.5 m-0">
                Ya existe un filtro con ese nombre — se sobrescribirá.
              </p>
            }
          } @else {
            <p class="text-[12.5px] text-ink-3 m-0">
              Configura al menos un filtro en la página para poder guardarlo.
            </p>
          }
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label
              class="text-[11.5px] text-ink-3 uppercase tracking-wider font-medium"
            >
              Tus filtros ({{ entries().length }})
            </label>
          </div>
          @if (entries().length === 0) {
            <p class="text-[12.5px] text-ink-3 m-0">
              Aún no has guardado filtros. Guarda tu primera combinación arriba.
            </p>
          } @else {
            <ul class="flex flex-col gap-1.5 m-0 p-0 list-none">
              @for (entry of entries(); track entry.id) {
                <li
                  class="flex items-center justify-between gap-3 px-3 py-2 rounded-sm border border-line bg-surface"
                >
                  <div class="min-w-0 flex-1">
                    <div class="text-[13.5px] font-medium truncate">{{ entry.name }}</div>
                    <div class="text-[11.5px] text-ink-3 truncate">
                      {{ describeFilters(entry.filters) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <ui-button (click)="onLoad(entry)">
                      <ui-icon name="play_arrow" [size]="14" />
                      Cargar
                    </ui-button>
                    <button
                      type="button"
                      class="rounded-sm w-8 h-8 grid place-items-center text-ink-3 hover:bg-hover hover:text-tier-red-ink"
                      [attr.aria-label]="'Eliminar filtro ' + entry.name"
                      (click)="onDelete(entry.id)"
                    >
                      <ui-icon name="delete" [size]="16" />
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <p class="text-[11.5px] text-ink-3 m-0">
          Los filtros se guardan en este navegador (localStorage). Máximo 20.
        </p>
        <ui-button (click)="close.emit()">Cerrar</ui-button>
      </footer>
    </ui-modal>
  `,
})
export class SavedFiltersModal {
  readonly open = input.required<boolean>();
  readonly currentFilters = input.required<InvestigationFilters>();
  readonly close = output<void>();
  readonly load = output<InvestigationFilters>();

  protected readonly entries = signal<SavedFilter[]>([]);
  protected readonly newName = signal<string>('');

  protected readonly canSaveCurrent = computed(() => !isEmpty(this.currentFilters()));

  protected readonly canSubmit = computed(
    () => this.canSaveCurrent() && this.newName().trim().length > 0,
  );

  protected readonly duplicateWarning = computed(() => {
    const trimmed = this.newName().trim();
    if (!trimmed) return false;
    return this.entries().some((e) => e.name === trimmed);
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.entries.set(loadSavedFilters());
      this.newName.set('');
    });
  }

  protected onSave(): void {
    if (!this.canSubmit()) return;
    const entry = saveSavedFilter(this.newName(), this.currentFilters());
    if (!entry) return;
    this.entries.set(loadSavedFilters());
    this.newName.set('');
  }

  protected onLoad(entry: SavedFilter): void {
    this.load.emit(entry.filters);
    this.close.emit();
  }

  protected onDelete(id: string): void {
    deleteSavedFilter(id);
    this.entries.set(loadSavedFilters());
  }

  protected describeFilters(filters: InvestigationFilters): string {
    const parts: string[] = [];
    if (filters.search.trim()) parts.push(`Búsqueda: ${filters.search.trim()}`);
    if (filters.tier !== 'todos') parts.push(`Riesgo: ${filters.tier}`);
    if (filters.ramo !== 'todos') parts.push(`Ramo: ${filters.ramo}`);
    if (filters.city.trim()) parts.push(`Ciudad: ${filters.city.trim()}`);
    if (filters.dateFrom) parts.push(`Desde: ${filters.dateFrom}`);
    if (filters.status !== 'todos') parts.push(`Estado: ${filters.status}`);
    return parts.length === 0 ? 'Sin filtros activos' : parts.join(' · ');
  }
}

function isEmpty(filters: InvestigationFilters): boolean {
  return (
    filters.search.trim() === '' &&
    filters.tier === EMPTY_INVESTIGATION_FILTERS.tier &&
    filters.ramo === EMPTY_INVESTIGATION_FILTERS.ramo &&
    filters.status === EMPTY_INVESTIGATION_FILTERS.status &&
    filters.city.trim() === '' &&
    filters.dateFrom === ''
  );
}
