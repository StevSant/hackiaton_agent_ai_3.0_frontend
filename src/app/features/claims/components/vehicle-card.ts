import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from '@shared/ui/icon';
import type { ClaimVehicle } from '../models';

@Component({
  selector: 'claim-vehicle-card',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Vehículo</h3>
        <ui-icon name="directions_car" [size]="16" />
      </div>
      <div class="grid grid-cols-2 gap-y-3.5 gap-x-6 px-5 py-4.5">
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Marca / Modelo</div>
          <div class="text-[13.5px] font-medium">{{ vehicle().marca }} {{ vehicle().modelo }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Año</div>
          <div class="text-[13.5px] font-medium">{{ vehicle().anio }}</div>
        </div>
        <div>
          <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Placa</div>
          <div class="text-[13.5px] font-medium font-mono">{{ vehicle().placa }}</div>
        </div>
        @if (vehicle().chasis) {
          <div>
            <div class="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-1">Chasis</div>
            <div class="text-[11.5px] font-mono">{{ vehicle().chasis }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class VehicleCard {
  readonly vehicle = input.required<ClaimVehicle>();
}
