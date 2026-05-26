import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarNav } from './sidebar-nav';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen grid grid-cols-[232px_1fr] bg-canvas text-ink">
      <app-sidebar-nav />
      <main class="overflow-y-auto scroll-pretty bg-canvas">
        <div class="max-w-page mx-auto px-8 pt-6 pb-20">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppShell {}
