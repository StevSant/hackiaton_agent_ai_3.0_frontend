import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { Icon } from '@shared/ui/icon';

export interface CityCompareOption {
  city: string;
  alertCount: number;
  rank: number;
}

type CompareSlot = 'primary' | 'compare';

@Component({
  selector: 'insights-city-compare-picker',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-city-compare" [class.insights-city-compare--active]="compareCity() !== null">
      @if (compareCity()) {
        <div class="insights-city-compare-toolbar insights-city-compare-toolbar--compact">
          <div class="insights-city-dual-compare">
            <button
              type="button"
              class="insights-city-dual-compare__trigger insights-city-dual-compare__trigger--primary"
              [class.insights-city-dual-compare__trigger--open]="openSlot() === 'primary'"
              (click)="toggleSlot('primary')"
              [attr.aria-expanded]="openSlot() === 'primary'"
              [attr.title]="'Ciudad A: ' + primaryCity()"
            >
              <span class="insights-city-dual-compare__slot">A</span>
              <span class="insights-city-dual-compare__name">{{ primaryCity() }}</span>
              <ui-icon name="expand_more" [size]="14" />
            </button>

            <button
              type="button"
              class="insights-city-dual-compare__swap"
              (click)="swapCities.emit()"
              aria-label="Intercambiar ciudades"
              title="Intercambiar ciudades"
            >
              <ui-icon name="swap_horiz" [size]="14" />
            </button>

            <button
              type="button"
              class="insights-city-dual-compare__trigger insights-city-dual-compare__trigger--other"
              [class.insights-city-dual-compare__trigger--open]="openSlot() === 'compare'"
              (click)="toggleSlot('compare')"
              [attr.aria-expanded]="openSlot() === 'compare'"
              [attr.title]="'Ciudad B: ' + compareCity()"
            >
              <span class="insights-city-dual-compare__slot">B</span>
              <span class="insights-city-dual-compare__name">{{ compareCity() }}</span>
              <ui-icon name="expand_more" [size]="14" />
            </button>

            <button
              type="button"
              class="insights-city-dual-compare__close"
              (click)="clearCompare.emit()"
              aria-label="Quitar comparación"
              title="Quitar comparación"
            >
              <ui-icon name="close" [size]="14" />
            </button>
          </div>
        </div>

        @if (openSlot(); as slot) {
          <div
            class="insights-city-compare__menu insights-city-compare__menu--compact"
            role="listbox"
            [attr.aria-label]="menuLabel(slot)"
          >
            <p class="insights-city-compare__hint">
              {{ slot === 'primary' ? 'Ciudad principal' : 'Ciudad comparada' }}
            </p>
            <ul class="insights-city-compare__list m-0 p-0 list-none">
              @for (option of slotOptions(slot); track option.city) {
                <li>
                  <button
                    type="button"
                    class="insights-city-compare__item"
                    [class.insights-city-compare__item--selected]="isSelected(slot, option.city)"
                    role="option"
                    [attr.aria-selected]="isSelected(slot, option.city)"
                    (click)="pickCity(slot, option.city)"
                  >
                    <span class="insights-city-compare__rank">#{{ option.rank }}</span>
                    <span class="insights-city-compare__name">{{ option.city }}</span>
                    <span class="insights-city-compare__count">{{ option.alertCount }}</span>
                  </button>
                </li>
              }
            </ul>
          </div>
        }
      } @else {
        <button
          type="button"
          class="insights-city-hero__cta insights-city-hero__cta--secondary insights-city-hero__cta--compact"
          (click)="toggleSlot('compare')"
          [attr.aria-expanded]="openSlot() === 'compare'"
          aria-controls="insights-city-compare-menu"
        >
          <ui-icon name="compare_arrows" [size]="14" />
          Comparar
        </button>

        @if (openSlot() === 'compare') {
          <div
            id="insights-city-compare-menu"
            class="insights-city-compare__menu insights-city-compare__menu--compact"
            role="listbox"
            aria-label="Elegir ciudad para comparar"
          >
            <p class="insights-city-compare__hint">Elige ciudad B</p>
            <ul class="insights-city-compare__list m-0 p-0 list-none">
              @for (option of slotOptions('compare'); track option.city) {
                <li>
                  <button
                    type="button"
                    class="insights-city-compare__item"
                    role="option"
                    (click)="pickCity('compare', option.city)"
                  >
                    <span class="insights-city-compare__rank">#{{ option.rank }}</span>
                    <span class="insights-city-compare__name">{{ option.city }}</span>
                    <span class="insights-city-compare__count">{{ option.alertCount }}</span>
                  </button>
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class CityComparePicker {
  readonly primaryCity = input.required<string>();
  readonly compareCity = input<string | null>(null);
  readonly options = input.required<readonly CityCompareOption[]>();
  readonly primarySelect = output<string>();
  readonly compareSelect = output<string>();
  readonly swapCities = output<void>();
  readonly clearCompare = output<void>();

  protected readonly openSlot = signal<CompareSlot | null>(null);

  protected slotOptions(slot: CompareSlot): readonly CityCompareOption[] {
    const blocked = slot === 'primary' ? this.compareCity() : this.primaryCity();
    return this.options().filter((option) => option.city !== blocked);
  }

  protected menuLabel(slot: CompareSlot): string {
    return slot === 'primary' ? 'Elegir ciudad principal' : 'Elegir ciudad para comparar';
  }

  protected isSelected(slot: CompareSlot, city: string): boolean {
    return slot === 'primary' ? city === this.primaryCity() : city === this.compareCity();
  }

  protected toggleSlot(slot: CompareSlot): void {
    this.openSlot.update((current) => (current === slot ? null : slot));
  }

  protected pickCity(slot: CompareSlot, city: string): void {
    if (slot === 'primary') {
      this.primarySelect.emit(city);
    } else {
      this.compareSelect.emit(city);
    }
    this.openSlot.set(null);
  }
}
