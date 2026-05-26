import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="border-b border-slate-200 dark:border-slate-800">
        <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a routerLink="/" class="flex items-center gap-2 font-semibold tracking-tight">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">
              <span class="material-symbols-outlined" aria-hidden="true">smart_toy</span>
            </span>
            Hackiaton 3.0
          </a>
          <div class="flex items-center gap-1 text-sm">
            <a
              routerLink="/chat"
              routerLinkActive="bg-slate-100 dark:bg-slate-800"
              class="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              Chat
            </a>
            <a
              routerLink="/uploads"
              routerLinkActive="bg-slate-100 dark:bg-slate-800"
              class="rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              Uploads
            </a>
          </div>
        </nav>
      </header>
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {}
