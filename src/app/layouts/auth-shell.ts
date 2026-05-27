import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">
      <aside class="hidden lg:block relative min-h-screen overflow-hidden">
        <img
          src="/assets/auth/centinela-hero.png"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 h-full w-full object-cover object-center"
          width="1024"
          height="1024"
          loading="eager"
          decoding="async"
        />
        <div
          class="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/45 to-transparent pointer-events-none"
          aria-hidden="true"
        ></div>
        <div
          class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/45 to-transparent pointer-events-none"
          aria-hidden="true"
        ></div>

        <div class="relative z-10 flex h-full min-h-screen flex-col justify-between px-10 xl:px-12 py-8 text-white">
          <div class="flex items-center gap-2.5 shrink-0 rounded-xl bg-black/25 px-3 py-2.5 backdrop-blur-[2px] w-fit">
            <div class="w-9 h-9 rounded-md grid place-items-center bg-white/15 backdrop-blur-sm border border-white/25">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3z" stroke="white" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M9 12.5 11 14.5 15 10.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <div class="font-semibold text-[16px] tracking-tight leading-none drop-shadow-sm">Centinela</div>
              <div class="text-[10.5px] uppercase tracking-[0.06em] opacity-90 mt-0.5 drop-shadow-sm">Fraud Intelligence</div>
            </div>
          </div>

          <div class="flex items-center gap-3 text-[11.5px] shrink-0 rounded-xl bg-black/25 px-3 py-2 backdrop-blur-[2px] w-fit">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              Datos sintéticos — sin PII real
            </span>
            <span class="opacity-60">·</span>
            <span>v0.1 prototipo</span>
          </div>
        </div>
      </aside>

      <main class="auth-panel-main flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div class="w-full max-w-[420px]">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AuthShell {}
