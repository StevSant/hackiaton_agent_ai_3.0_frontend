import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

@Component({
  selector: 'ui-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="classes()">
      <ng-content />
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);

  protected readonly classes = computed(() => {
    const base =
      'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-control)] text-[13px] font-medium ' +
      'border transition-[background-color,border-color,color] duration-150 select-none box-border ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';
    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-brand text-[var(--brand-on)] border-transparent shadow-none ' +
        'hover:bg-brand-2 focus-visible:ring-brand',
      secondary:
        'bg-surface text-ink border-line shadow-1 ' +
        'hover:bg-hover hover:border-line-2 focus-visible:ring-line-2',
      ghost:
        'bg-transparent text-ink-2 border-transparent shadow-none ' +
        'hover:bg-hover hover:text-ink',
    };
    return `${base} ${variants[this.variant()]}`;
  });
}
