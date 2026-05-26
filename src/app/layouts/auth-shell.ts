import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">
      <aside
        class="hidden lg:flex flex-col justify-between px-12 py-10 relative overflow-hidden text-white"
        style="background: radial-gradient(circle at 18% 12%, color-mix(in oklch, var(--brand-2) 80%, transparent), transparent 55%), linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-md grid place-items-center bg-white/15 backdrop-blur-sm border border-white/25">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z" stroke="white" stroke-width="1.8" stroke-linejoin="round" />
              <path d="M9 12.5 11 14.5 15 10.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-[16px] tracking-tight leading-none">Centinela</div>
            <div class="text-[10.5px] uppercase tracking-[0.06em] opacity-80 mt-0.5">Fraud Intelligence</div>
          </div>
        </div>

        <div class="max-w-[480px] relative">
          <div class="text-[12px] uppercase tracking-[0.1em] opacity-80 mb-3 font-medium">hackIAthon 3 · Aseguradora del Sur</div>
          <h1 class="font-serif text-[44px] leading-[1.1] tracking-tight m-0 mb-4">
            Detección asistida de <span class="italic">posible fraude</span> en siniestros.
          </h1>
          <p class="text-[14.5px] leading-relaxed opacity-90 m-0">
            Centinela analiza cada reclamo con 14 señales de fraude, modelo de ML supervisado y un agente conversacional
            que cita evidencia. <b>Nunca acusa — surfaceamos casos que requieren revisión.</b>
          </p>
        </div>

        <div class="flex items-center gap-3 text-[11.5px] opacity-80">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            Datos sintéticos — sin PII real
          </span>
          <span class="opacity-60">·</span>
          <span>v0.1 prototipo</span>
        </div>
      </aside>

      <main class="flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div class="w-full max-w-[400px]">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AuthShell {}
