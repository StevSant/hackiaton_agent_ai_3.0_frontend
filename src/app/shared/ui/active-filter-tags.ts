import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from './icon';

export interface FilterTag {
  key: string;
  label: string;
}

@Component({
  selector: 'ui-active-filter-tags',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tags().length > 0) {
      <div class="flex flex-wrap items-center gap-2">
        @for (t of tags(); track t.key) {
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-soft text-ink-2 border border-line"
          >
            {{ t.label }}
            <button
              type="button"
              class="border-0 bg-transparent p-0 cursor-pointer text-ink-3 hover:text-ink grid place-items-center"
              (click)="remove.emit(t.key)"
              [attr.aria-label]="'Quitar filtro ' + t.label"
            >
              <ui-icon name="close" [size]="14" />
            </button>
          </span>
        }
        <button
          type="button"
          class="text-[13px] text-ink-3 hover:text-ink bg-transparent border-0 cursor-pointer px-2 py-1"
          (click)="clear.emit()"
        >
          Limpiar filtros
        </button>
      </div>
    }
  `,
})
export class ActiveFilterTags {
  readonly tags = input.required<readonly FilterTag[]>();
  readonly remove = output<string>();
  readonly clear = output<void>();
}
