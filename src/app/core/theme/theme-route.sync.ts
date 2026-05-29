import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { isMarketingPath } from './theme-path';
import { ThemeStore } from './theme.store';

/** Aplica tema oscuro en landing/login y la preferencia de app en rutas autenticadas. */
@Injectable({ providedIn: 'root' })
export class ThemeRouteSync {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeStore);

  constructor() {
    const sync = (url: string) => {
      const path = url.split('?')[0].split('#')[0];
      this.theme.setMarketingRoute(isMarketingPath(path));
    };

    sync(this.router.url || (typeof window !== 'undefined' ? window.location.pathname : '/'));

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      sync((event as NavigationEnd).urlAfterRedirects);
    });
  }
}
