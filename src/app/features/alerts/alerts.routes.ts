import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/alerts.page').then((m) => m.AlertsPage),
  },
];
