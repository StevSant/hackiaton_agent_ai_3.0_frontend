import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Button } from '@shared/ui/button';
import { Icon } from '@shared/ui/icon';

import { InsightsStore } from '../services/insights.store';
import { citySlugEncode } from '../utils/city-insights';

@Component({
  selector: 'insights-city-nav-button',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-city-nav">
      <ui-button
        variant="secondary"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="insights-city-nav-menu"
        (click)="toggleMenu($event)"
      >
        <ui-icon name="location_city" [size]="14" />
        Análisis por ciudad
        <ui-icon [name]="menuOpen() ? 'expand_less' : 'expand_more'" [size]="14" />
      </ui-button>

      @if (menuOpen()) {
        <div
          id="insights-city-nav-menu"
          class="insights-city-nav__menu"
          role="listbox"
          aria-label="Elegir ciudad para análisis"
          [style.top.px]="menuTop()"
          [style.left.px]="menuLeft()"
        >
          @for (city of cities(); track city.region; let index = $index) {
            <button
              type="button"
              class="insights-city-nav__item"
              role="option"
              (click)="openCity(city.region)"
            >
              <span class="insights-city-nav__rank">#{{ index + 1 }}</span>
              <span class="insights-city-nav__name">{{ city.region }}</span>
              <span class="insights-city-nav__count">{{ city.value }} alertas</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class CityNavButton {
  private static readonly MENU_WIDTH = 240;

  private readonly store = inject(InsightsStore);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly menuOpen = signal(false);
  protected readonly menuTop = signal(0);
  protected readonly menuLeft = signal(0);

  protected readonly cities = computed(() =>
    this.store.cityCatalog().map((city) => ({
      region: city.region,
      value: city.alerts,
      total: city.total,
    })),
  );

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected repositionMenu(): void {
    if (this.menuOpen()) this.updateMenuPosition();
  }

  protected toggleMenu(event: Event): void {
    event.stopPropagation();
    const willOpen = !this.menuOpen();
    if (willOpen) {
      this.updateMenuPosition();
    }
    this.menuOpen.set(willOpen);
  }

  protected openCity(region: string): void {
    this.menuOpen.set(false);
    void this.router.navigate(['/insights', 'ciudad', citySlugEncode(region)]);
  }

  private updateMenuPosition(): void {
    const trigger = this.host.nativeElement.querySelector('button');
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxLeft = window.innerWidth - CityNavButton.MENU_WIDTH - 8;
    const left = Math.max(8, Math.min(rect.left, maxLeft));

    this.menuTop.set(Math.round(rect.bottom + 6));
    this.menuLeft.set(Math.round(left));
  }
}
