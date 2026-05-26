import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bandeja' },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/bandeja.page').then((m) => m.BandejaPage),
  },
];
