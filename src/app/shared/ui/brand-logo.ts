import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="centinela-brand-mark px-2 pt-1 pb-5 border-b border-line mb-1">
      <div class="font-display font-semibold text-[17px] tracking-[-0.03em] leading-none text-ink">
        {{ name() }}
      </div>
      <div class="centinela-brand-mark__tagline mt-1.5">
        Fraud Intelligence
      </div>
    </div>
  `,
})
export class BrandLogo {
  readonly name = input<string>('Centinela IA');
}
