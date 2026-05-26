import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] border font-medium select-none cursor-pointer transition-colors"
      [class]="classes()"
    >
      <ng-content />
    </span>
  `,
})
export class Chip {
  readonly active = input<boolean>(false);

  protected readonly classes = computed(() =>
    this.active()
      ? 'bg-ink border-ink text-canvas hover:bg-ink'
      : 'bg-surface border-line text-ink-2 hover:bg-hover',
  );
}
