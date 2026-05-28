import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="centinela-page-header" [class.centinela-page-header--compact]="compact()">
      <div class="centinela-page-header__card">
        @if (eyebrow()) {
          <p class="centinela-page-header__eyebrow">{{ eyebrow() }}</p>
        }
        <div class="centinela-page-header__row">
          <div class="min-w-0">
            <h1 class="centinela-page-header__title">{{ title() }}</h1>
            <ng-content select="[description]" />
          </div>
          <div class="centinela-page-header__actions">
            <ng-content select="[actions]" />
          </div>
        </div>
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly compact = input(false);
}
