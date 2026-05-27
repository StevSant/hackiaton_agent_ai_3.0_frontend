import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2.5 px-2 pt-1 pb-4">
      <div
        class="relative w-8 h-8 rounded-[10px] grid place-items-center text-white shrink-0"
        style="background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%); box-shadow: 0 4px 12px color-mix(in oklch, var(--brand) 32%, transparent);"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
            stroke="white"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" />
        </svg>
        <span class="absolute inset-px rounded-[9px] border border-white/20 pointer-events-none"></span>
      </div>
      <div class="min-w-0">
        <div class="font-semibold text-[15px] tracking-tight leading-none">{{ name() }}</div>
        <div class="text-[10.5px] text-ink-3 uppercase tracking-[0.05em] mt-0.5">Fraud Intelligence</div>
      </div>
    </div>
  `,
})
export class BrandLogo {
  readonly name = input<string>('Centinela IA');
}
