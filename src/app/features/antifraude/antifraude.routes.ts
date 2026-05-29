import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bandeja' },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/bandeja.page').then((m) => m.BandejaPage),
    data: { viewportFit: true },
  },
  {
    path: 'investigacion',
    loadComponent: () =>
      import('./pages/investigacion.page').then((m) => m.InvestigacionPage),
  },
];
