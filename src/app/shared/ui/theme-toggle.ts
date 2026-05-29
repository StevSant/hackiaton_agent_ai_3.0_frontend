import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ThemeStore } from '@core/theme/theme.store';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'ui-theme-toggle',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border transition-colors"
      [class]="sizeClass()"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.dark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      [attr.title]="theme.dark() ? 'Modo claro' : 'Modo oscuro'"
    >
      <ui-icon [name]="theme.dark() ? 'light_mode' : 'dark_mode'" [size]="iconSize()" />
      @if (showLabel()) {
        <span>{{ theme.dark() ? 'Claro' : 'Oscuro' }}</span>
      }
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeStore);

  readonly showLabel = input<boolean>(false);
  readonly compact = input<boolean>(false);

  protected iconSize(): number {
    return this.compact() ? 16 : 18;
  }

  protected sizeClass(): string {
    if (this.compact()) {
      return this.showLabel()
        ? 'px-2.5 py-1.5 text-[11.5px] font-medium border-mkt-border bg-mkt-chip text-mkt-ink-2 hover:text-mkt-ink hover:border-mkt-accent-border shadow-1'
        : 'w-9 h-9 border-mkt-border bg-mkt-chip text-mkt-ink-2 hover:text-mkt-ink hover:border-mkt-accent-border shadow-1';
    }
    return this.showLabel()
      ? 'px-3 py-2 text-[12.5px] font-medium border-mkt-border bg-mkt-chip text-mkt-ink-2 hover:text-mkt-ink hover:border-mkt-accent-border shadow-1'
      : 'w-10 h-10 border-mkt-border bg-mkt-chip text-mkt-ink-2 hover:text-mkt-ink hover:border-mkt-accent-border shadow-1';
  }
}
