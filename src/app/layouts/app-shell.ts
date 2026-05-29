import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { KeyboardShortcutsService } from '@core/keyboard/keyboard-shortcuts.service';
import { Icon } from '@shared/ui/icon';
import { KeyboardShortcutsHelp } from '@shared/ui/keyboard-shortcuts-help';
import { bindShortcutHandlers, isHelpKey } from '@shared/utils';
import { SidebarNav } from './sidebar-nav';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarNav, Icon, KeyboardShortcutsHelp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-screen bg-canvas text-ink flex flex-col md:grid md:grid-cols-[248px_1fr] md:grid-rows-1 relative min-h-0">
      <button
        type="button"
        class="md:hidden fixed z-30 grid place-items-center bg-surface border border-line shadow-pop text-ink-2 hover:text-ink hover:bg-hover"
        [class.top-3]="!fullBleed()"
        [class.left-3]="!fullBleed()"
        [class.w-10]="!fullBleed()"
        [class.h-10]="!fullBleed()"
        [class.rounded-md]="!fullBleed()"
        [class.centinela-shell-menu--fullbleed]="fullBleed()"
        (click)="sidebarOpen.set(true)"
        aria-label="Abrir menú"
      >
        <ui-icon name="menu" [size]="fullBleed() ? 18 : 20" />
      </button>

      @if (sidebarOpen()) {
        <div
          class="md:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1.5px]"
          (click)="sidebarOpen.set(false)"
          aria-hidden="true"
        ></div>
      }

      <div
        class="fixed md:static inset-y-0 left-0 z-50 md:z-auto w-[260px] max-w-[82vw] md:w-auto md:max-w-none md:translate-x-0 transform transition-transform duration-200 ease-out shadow-pop md:shadow-none h-full min-h-0 flex flex-col"
        [class.translate-x-0]="sidebarOpen()"
        [class.-translate-x-full]="!sidebarOpen()"
      >
        <app-sidebar-nav />
      </div>

      <main tabindex="-1" [class]="mainClasses()" class="centinela-main min-h-0 outline-none">
        <div [class]="contentWrapperClasses()">
          <router-outlet />
        </div>
      </main>
    </div>

    <ui-keyboard-shortcuts-help />
  `,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly shortcuts = inject(KeyboardShortcutsService);

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

  protected readonly mainClasses = computed(() => {
    if (this.fullBleed()) return 'centinela-main--full-bleed h-full overflow-hidden';
    if (this.viewportFit()) return 'centinela-main--viewport h-full overflow-hidden';
    return 'flex-1 md:flex-initial overflow-y-auto scroll-pretty';
  });

  protected readonly contentWrapperClasses = computed(() => {
    if (this.fullBleed()) return 'contents';
    if (this.viewportFit()) return 'centinela-viewport-shell';
    return 'max-w-page mx-auto px-4 md:px-8 pt-14 md:pt-8 pb-24 min-w-0';
  });

  constructor() {
    bindShortcutHandlers(
      this.destroyRef,
      this.shortcuts,
      [
        {
          keys: '?',
          label: 'Mostrar u ocultar atajos',
          group: 'General',
          // Lets "?" close the already-open help modal; typing "?" inside an
          // input/textarea still inserts the character (never opens the modal).
          allowWhenDialogOpen: true,
          test: (event) => isHelpKey(event),
          run: () => this.shortcuts.toggleHelp(),
        },
      ],
    );

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
