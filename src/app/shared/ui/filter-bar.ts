import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';

import { ActiveFilterTags, type FilterTag } from './active-filter-tags';
import { Chip } from './chip';
import { Icon } from './icon';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

export interface FilterControl {
  type: 'search' | 'select' | 'chips' | 'date';
  key: string;
  label?: string;
  placeholder?: string;
  icon?: string;
  options?: readonly FilterOption[];
  /** Sentinel meaning "no filter applied". Default ''. e.g. 'todos' for chip groups. */
  emptyValue?: string;
}

export type FilterValue = Record<string, string>;

@Component({
  selector: 'ui-filter-bar',
  standalone: true,
  imports: [ActiveFilterTags, Chip, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1 px-4 py-3 mb-4 flex flex-col gap-3">
      <div class="flex items-center gap-2 flex-wrap">
        @for (c of controls(); track c.key) {
          @switch (c.type) {
            @case ('search') {
              <label class="centinela-field centinela-field--grow">
                <ui-icon name="search" [size]="16" />
                <input
                  type="search"
                  data-keyboard-search
                  [placeholder]="c.placeholder ?? 'Buscar…'"
                  [value]="currentValue(c)"
                  (input)="onSearch(c.key, $any($event.target).value)"
                />
              </label>
            }
            @case ('select') {
              <label class="centinela-field">
                @if (c.icon) {
                  <ui-icon [name]="c.icon" [size]="16" />
                }
                <select
                  [value]="currentValue(c)"
                  (change)="patch(c.key, $any($event.target).value)"
                >
                  @for (o of c.options ?? []; track o.value) {
                    <option [value]="o.value">{{ o.label }}</option>
                  }
                </select>
              </label>
            }
            @case ('date') {
              <label class="centinela-field">
                <ui-icon [name]="c.icon ?? 'calendar_today'" [size]="16" />
                <input
                  type="date"
                  [value]="currentValue(c)"
                  (input)="patch(c.key, $any($event.target).value)"
                />
              </label>
            }
            @case ('chips') {
              <div class="flex items-center gap-1.5 flex-wrap">
                @for (o of c.options ?? []; track o.value) {
                  <ui-chip
                    [active]="currentValue(c) === o.value"
                    (click)="patch(c.key, o.value)"
                  >
                    @if (o.icon) {
                      <ui-icon [name]="o.icon" [size]="11" />
                    }
                    {{ o.label }}
                  </ui-chip>
                }
              </div>
            }
          }
        }
      </div>

      <ui-active-filter-tags
        [tags]="activeTags()"
        (remove)="onRemove($event)"
        (clear)="onClear()"
      />
    </div>
  `,
})
export class FilterBar {
  readonly controls = input.required<readonly FilterControl[]>();
  readonly value = input.required<FilterValue>();
  readonly valueChange = output<FilterValue>();
  readonly reset = output<void>();

  private readonly searchTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    // Clear any pending debounce timers so a late emit never fires post-destroy.
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.searchTimers.values()) clearTimeout(timer);
    });
  }

  protected readonly activeTags = computed<FilterTag[]>(() => {
    const tags: FilterTag[] = [];
    for (const c of this.controls()) {
      const current = this.currentValue(c);
      if (current === this.emptyOf(c) || current === '') continue;
      tags.push({ key: c.key, label: this.tagLabel(c, current) });
    }
    return tags;
  });

  protected emptyOf(c: FilterControl): string {
    return c.emptyValue ?? '';
  }

  /** Current value for a control, falling back to its empty sentinel. */
  protected currentValue(c: FilterControl): string {
    const v = this.value()[c.key];
    return v ?? this.emptyOf(c);
  }

  protected patch(key: string, value: string): void {
    this.valueChange.emit({ ...this.value(), [key]: value });
  }

  protected onSearch(key: string, value: string): void {
    const existing = this.searchTimers.get(key);
    if (existing) clearTimeout(existing);
    this.searchTimers.set(
      key,
      setTimeout(() => this.patch(key, value), 150),
    );
  }

  protected onRemove(key: string): void {
    const control = this.controls().find((c) => c.key === key);
    this.patch(key, control ? this.emptyOf(control) : '');
  }

  protected onClear(): void {
    const cleared: FilterValue = {};
    for (const c of this.controls()) cleared[c.key] = this.emptyOf(c);
    this.valueChange.emit(cleared);
    this.reset.emit();
  }

  private tagLabel(c: FilterControl, current: string): string {
    const prefix = c.label ? `${c.label}: ` : '';
    if (c.type === 'select' || c.type === 'chips') {
      const match = (c.options ?? []).find((o) => o.value === current);
      return `${prefix}${match?.label ?? current}`;
    }
    if (c.type === 'date') return `${prefix}${formatTagDate(current)}`;
    return current; // search: show the raw term, no prefix
  }
}

function formatTagDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
