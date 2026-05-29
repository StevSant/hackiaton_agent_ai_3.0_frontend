import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedTab {
  key: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'ui-segmented-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-segmented" role="tablist">
      @for (t of tabs(); track t.key) {
        <button
          type="button"
          role="tab"
          class="centinela-segmented__btn"
          [class.centinela-segmented__btn--active]="t.key === active()"
          [attr.aria-selected]="t.key === active()"
          (click)="select.emit(t.key)"
        >
          {{ t.label }}
          @if (t.count !== undefined && t.count > 0) {
            <span class="ml-1.5 text-[10.5px] tabular-nums opacity-80">{{ t.count }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class SegmentedTabs {
  readonly tabs = input.required<readonly SegmentedTab[]>();
  readonly active = input.required<string>();
  readonly select = output<string>();
}
