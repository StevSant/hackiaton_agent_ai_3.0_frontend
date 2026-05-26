import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2.5 px-2 pt-1 pb-4">
      <div class="relative w-7 h-7 rounded-md grid place-items-center text-white"
           style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%); box-shadow: 0 2px 6px color-mix(in oklch, var(--brand) 35%, transparent);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z" stroke="white" stroke-width="1.8" stroke-linejoin="round" />
          <path d="M9 12.5 11 14.5 15 10.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="absolute inset-px rounded-md border border-white/20 pointer-events-none"></span>
      </div>
      <div>
        <div class="font-semibold text-[15px] tracking-tight leading-none">{{ name() }}</div>
        <div class="text-[10.5px] text-ink-3 uppercase tracking-[0.05em] mt-0.5">Fraud Intelligence</div>
      </div>
    </div>
  `,
})
export class BrandLogo {
  readonly name = input<string>('Centinela');
}
