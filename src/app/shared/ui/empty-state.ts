import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-12 px-4 text-ink-3">
      <div class="text-[14px] font-medium text-ink-2">{{ title() }}</div>
      @if (sub()) {
        <div class="text-[12.5px] mt-1">{{ sub() }}</div>
      }
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly sub = input<string>('');
}
