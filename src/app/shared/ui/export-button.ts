import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from './button';
import { Icon } from './icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

@Component({
  selector: 'ui-export-button',
  standalone: true,
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-button [variant]="variant()" [disabled]="disabled()" (click)="trigger.emit()">
      <ui-icon name="download" [size]="14" />
      {{ label() }}
    </ui-button>
  `,
})
export class ExportButton {
  readonly label = input<string>('Exportar reporte');
  readonly disabled = input<boolean>(false);
  readonly variant = input<ButtonVariant>('secondary');
  readonly trigger = output<void>();
}
