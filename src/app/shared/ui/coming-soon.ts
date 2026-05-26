import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from './icon';

@Component({
  selector: 'ui-coming-soon',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-20 px-6">
      <div
        class="w-14 h-14 rounded-xl mx-auto mb-4 grid place-items-center"
        style="background: var(--brand-soft); color: var(--brand-ink);"
      >
        <ui-icon [name]="icon()" [size]="24" />
      </div>
      <h2 class="text-[20px] font-semibold tracking-tight m-0 mb-1.5">{{ title() }}</h2>
      <p class="text-ink-3 text-[13px] max-w-[420px] mx-auto m-0">{{ description() }}</p>
    </div>
  `,
})
export class ComingSoon {
  readonly title = input<string>('Módulo en construcción');
  readonly description = input<string>(
    'Esta sección está en el roadmap del prototipo. Por ahora puedes explorar Bandeja, Centinela IA y Proveedores.',
  );
  readonly icon = input<string>('construction');
}
