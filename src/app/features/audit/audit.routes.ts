import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/audit.page').then((m) => m.AuditPage),
  },
];
