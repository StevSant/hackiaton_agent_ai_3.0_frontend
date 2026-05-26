import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { Modal } from '../../../shared/ui/modal';
import type { AuditAction, AuditActor } from '../models';

interface ActorOpt {
  value: AuditActor;
  label: string;
  icon: string;
}
interface ActionOpt {
  value: AuditAction;
  label: string;
}

@Component({
  selector: 'audit-advanced-filters-modal',
  standalone: true,
  imports: [Button, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="open()"
      title="Filtros avanzados"
      subtitle="Acota la bitácora por rango, actor, acción y recurso."
      size="md"
      (close)="close.emit()"
    >
      <div class="px-5 py-5 flex flex-col gap-5">
        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Rango de fechas</label>
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            @for (p of presets; track p.value) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-full text-[12px] border"
                [class]="preset() === p.value ? 'bg-ink text-canvas border-ink' : 'bg-surface text-ink-2 border-line hover:bg-hover'"
                (click)="preset.set(p.value)"
              >
                {{ p.label }}
              </button>
            }
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-2 bg-surface border border-line rounded-sm px-3 py-2">
              <ui-icon name="calendar_today" [size]="14" />
              <input type="date" class="flex-1 bg-transparent border-0 outline-0 text-[13px]" [value]="from()" (input)="from.set($any($event.target).value); preset.set('custom')" />
            </div>
            <div class="flex items-center gap-2 bg-surface border border-line rounded-sm px-3 py-2">
              <ui-icon name="event" [size]="14" />
              <input type="date" class="flex-1 bg-transparent border-0 outline-0 text-[13px]" [value]="to()" (input)="to.set($any($event.target).value); preset.set('custom')" />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Actor</label>
          <div class="grid grid-cols-3 gap-2">
            @for (a of actors; track a.value) {
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-sm border text-[13px]"
                [class]="actors_sel().has(a.value) ? 'bg-brand-soft border-brand-ink text-brand-ink' : 'bg-surface border-line hover:bg-hover'"
                (click)="toggleActor(a.value)"
              >
                <ui-icon [name]="a.icon" [size]="14" />
                {{ a.label }}
              </button>
            }
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Tipo de acción</label>
          <div class="grid grid-cols-2 gap-1.5">
            @for (act of actions; track act.value) {
              <label class="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-line bg-surface text-[13px] cursor-pointer select-none hover:bg-hover">
                <input
                  type="checkbox"
                  class="accent-[var(--brand)]"
                  [checked]="actions_sel().has(act.value)"
                  (change)="toggleAction(act.value)"
                />
                {{ act.label }}
              </label>
            }
          </div>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Recurso (ID)</label>
          <div class="flex items-center gap-2 bg-surface border border-line rounded-sm px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
            <ui-icon name="search" [size]="14" />
            <input
              type="text"
              class="flex-1 bg-transparent border-0 outline-0 text-[13.5px] font-mono"
              placeholder="SIN-2026-… o PRV-…"
              [value]="resource()"
              (input)="resource.set($any($event.target).value)"
            />
          </div>
          <p class="text-[11.5px] text-ink-4 mt-1.5">Filtra por siniestro, proveedor o regla específica.</p>
        </div>

        <div>
          <label class="block text-[11.5px] text-ink-3 uppercase tracking-wider font-medium mb-2">Opciones</label>
          <div class="flex flex-col gap-1.5">
            <label class="flex items-center gap-2 text-[13px] cursor-pointer select-none">
              <input type="checkbox" class="accent-[var(--brand)]" [checked]="onlyEscalated()" (change)="onlyEscalated.set($any($event.target).checked)" />
              Solo eventos con escalamiento subsecuente
            </label>
            <label class="flex items-center gap-2 text-[13px] cursor-pointer select-none">
              <input type="checkbox" class="accent-[var(--brand)]" [checked]="includeAI()" (change)="includeAI.set($any($event.target).checked)" />
              Incluir respuestas del agente IA
            </label>
            <label class="flex items-center gap-2 text-[13px] cursor-pointer select-none">
              <input type="checkbox" class="accent-[var(--brand)]" [checked]="includeSystem()" (change)="includeSystem.set($any($event.target).checked)" />
              Incluir eventos automáticos del sistema
            </label>
          </div>
        </div>
      </div>

      <footer footer class="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line bg-soft">
        <button type="button" class="text-[12.5px] text-ink-3 hover:text-ink underline-offset-2 hover:underline" (click)="onReset()">
          Limpiar filtros
        </button>
        <div class="flex items-center gap-3">
          <span class="text-[12px] text-ink-3">{{ summary() }}</span>
          <ui-button (click)="close.emit()">Cancelar</ui-button>
          <ui-button variant="primary" (click)="onApply()">
            <ui-icon name="check" [size]="14" />
            Aplicar
          </ui-button>
        </div>
      </footer>
    </ui-modal>
  `,
})
export class AdvancedFiltersModal {
  readonly open = input.required<boolean>();
  readonly close = output<void>();
  readonly apply = output<void>();

  protected readonly presets: { value: string; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: 'mtd', label: 'Mes en curso' },
    { value: 'custom', label: 'Personalizado' },
  ];

  protected readonly actors: ActorOpt[] = [
    { value: 'analista', label: 'Analistas', icon: 'person' },
    { value: 'agente', label: 'Centinela IA', icon: 'auto_awesome' },
    { value: 'sistema', label: 'Sistema', icon: 'memory' },
  ];

  protected readonly actions: ActionOpt[] = [
    { value: 'apertura', label: 'Apertura de caso' },
    { value: 'escalamiento', label: 'Escalamiento' },
    { value: 'consulta_ia', label: 'Consulta a la IA' },
    { value: 'cambio_regla', label: 'Cambio de regla' },
    { value: 'cierre', label: 'Cierre de caso' },
    { value: 'export', label: 'Exportación' },
  ];

  protected readonly preset = signal<string>('7d');
  protected readonly from = signal<string>('2026-05-19');
  protected readonly to = signal<string>('2026-05-26');
  protected readonly resource = signal<string>('');
  protected readonly onlyEscalated = signal<boolean>(false);
  protected readonly includeAI = signal<boolean>(true);
  protected readonly includeSystem = signal<boolean>(true);

  protected readonly actors_sel = signal<Set<AuditActor>>(new Set(['analista', 'agente', 'sistema']));
  protected readonly actions_sel = signal<Set<AuditAction>>(
    new Set(['apertura', 'escalamiento', 'consulta_ia', 'cambio_regla', 'cierre', 'export']),
  );

  protected readonly summary = computed(() => {
    const a = this.actors_sel().size;
    const ac = this.actions_sel().size;
    return `${a} actor${a === 1 ? '' : 'es'} · ${ac} acción${ac === 1 ? '' : 'es'}`;
  });

  protected toggleActor(v: AuditActor): void {
    const next = new Set(this.actors_sel());
    if (next.has(v)) next.delete(v);
    else next.add(v);
    this.actors_sel.set(next);
  }

  protected toggleAction(v: AuditAction): void {
    const next = new Set(this.actions_sel());
    if (next.has(v)) next.delete(v);
    else next.add(v);
    this.actions_sel.set(next);
  }

  protected onReset(): void {
    this.preset.set('7d');
    this.resource.set('');
    this.onlyEscalated.set(false);
    this.includeAI.set(true);
    this.includeSystem.set(true);
    this.actors_sel.set(new Set(['analista', 'agente', 'sistema']));
    this.actions_sel.set(new Set(['apertura', 'escalamiento', 'consulta_ia', 'cambio_regla', 'cierre', 'export']));
  }

  protected onApply(): void {
    this.apply.emit();
    this.close.emit();
  }
}
