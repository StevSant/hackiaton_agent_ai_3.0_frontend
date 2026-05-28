import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { Icon } from '@shared/ui/icon';
import { SidebarNav } from './sidebar-nav';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen bg-canvas text-ink flex flex-col md:grid md:grid-cols-[248px_1fr] md:grid-rows-1 relative min-h-0">
      <!-- Mobile hamburger: opens the sidebar as a drawer below md -->
      <button
        type="button"
        class="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-md bg-surface border border-line shadow-pop grid place-items-center text-ink-2 hover:text-ink hover:bg-hover"
        (click)="sidebarOpen.set(true)"
        aria-label="Abrir menú"
      >
        <ui-icon name="menu" [size]="20" />
      </button>

      <!-- Drawer backdrop -->
      @if (sidebarOpen()) {
        <div
          class="md:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1.5px]"
          (click)="sidebarOpen.set(false)"
          aria-hidden="true"
        ></div>
      }

      <!-- Sidebar: static at md+, fixed slide-in drawer below md -->
      <div
        class="fixed md:static inset-y-0 left-0 z-50 md:z-auto w-[260px] max-w-[82vw] md:w-auto md:max-w-none md:translate-x-0 transform transition-transform duration-200 ease-out shadow-pop md:shadow-none h-full min-h-0 flex flex-col"
        [class.translate-x-0]="sidebarOpen()"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <app-sidebar-nav />
      </div>

      @if (fullBleed()) {
        <main class="centinela-main centinela-main--full-bleed min-h-0 h-full overflow-hidden">
          <router-outlet />
        </main>
      } @else if (viewportFit()) {
        <main class="centinela-main centinela-main--viewport min-h-0 h-full overflow-hidden">
          <div class="centinela-viewport-shell">
            <router-outlet />
          </div>
        </main>
      } @else {
        <main class="flex-1 md:flex-initial min-h-0 overflow-y-auto scroll-pretty centinela-main">
          <div class="max-w-page mx-auto px-4 md:px-8 pt-14 md:pt-8 pb-24">
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sidebarOpen = signal<boolean>(false);

  protected readonly fullBleed = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveRouteFlag('fullBleed')),
      startWith(this.resolveRouteFlag('fullBleed')),
    ),
    { initialValue: false },
  );

  protected readonly viewportFit = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveRouteFlag('viewportFit')),
      startWith(this.resolveRouteFlag('viewportFit')),
    ),
    { initialValue: false },
  );

  constructor() {
    // Auto-close the drawer when the user navigates (mobile only — at md+
    // the sidebar is part of the grid and the signal does nothing visible).
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.sidebarOpen.set(false));
  }

  private resolveRouteFlag(flag: 'fullBleed' | 'viewportFit'): boolean {
    let route = this.route.snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data?.[flag] === true;
  }
}
