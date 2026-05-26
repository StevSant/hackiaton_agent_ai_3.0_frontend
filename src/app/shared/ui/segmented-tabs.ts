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
    <div class="inline-flex items-center gap-0.5 bg-soft border border-line rounded-md p-0.5">
      @for (t of tabs(); track t.key) {
        <button
          type="button"
          class="px-3 py-1 rounded-sm text-[12.5px] font-medium transition-colors"
          [class]="t.key === active() ? 'bg-surface text-ink shadow-1' : 'text-ink-3 hover:text-ink'"
          (click)="select.emit(t.key)"
        >
          {{ t.label }}
          @if (t.count !== undefined && t.count > 0) {
            <span class="ml-1.5 text-[10.5px] tabular-nums" [class]="t.key === active() ? 'text-ink-3' : 'text-ink-4'">{{ t.count }}</span>
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
