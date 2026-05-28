import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SidebarNav } from './sidebar-nav';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen grid grid-cols-[232px_1fr] grid-rows-1 overflow-hidden bg-canvas text-ink">
      <app-sidebar-nav />
      @if (fullBleed()) {
        <main class="bg-canvas min-h-0 overflow-hidden">
          <router-outlet />
        </main>
      } @else {
        <main class="overflow-y-auto scroll-pretty bg-canvas">
          <div class="max-w-page mx-auto px-8 pt-6 pb-20">
            <router-outlet />
          </div>
        </main>
      }
    </div>
  `,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly fullBleed = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveFullBleed()),
      startWith(this.resolveFullBleed()),
    ),
    { initialValue: false },
  );

  private resolveFullBleed(): boolean {
    let route = this.route.snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data?.['fullBleed'] === true;
  }
}
