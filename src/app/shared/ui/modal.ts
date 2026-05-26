import { ChangeDetectionStrategy, Component, HostListener, computed, input, output } from '@angular/core';

import { Icon } from './icon';

type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[1.5px]"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="bg-surface border border-line rounded-lg shadow-pop w-full overflow-hidden flex flex-col max-h-[88vh]"
          [class]="sizeClass()"
          (click)="$event.stopPropagation()"
        >
          <header class="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-line">
            <div class="min-w-0">
              <h2 class="text-[15px] font-semibold tracking-tight m-0 truncate">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="text-[12.5px] text-ink-3 m-0 mt-0.5 truncate">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              class="rounded-sm w-8 h-8 grid place-items-center text-ink-3 hover:bg-hover hover:text-ink shrink-0"
              (click)="close.emit()"
              aria-label="Cerrar"
            >
              <ui-icon name="close" [size]="18" />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto scroll-pretty">
            <ng-content />
          </div>
          <ng-content select="[footer]" />
        </div>
      </div>
    }
  `,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly close = output<void>();

  protected readonly sizeClass = computed(() => {
    const s = this.size();
    return s === 'sm' ? 'max-w-[440px]' : s === 'lg' ? 'max-w-[860px]' : 'max-w-[620px]';
  });

  protected onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close.emit();
  }
}
