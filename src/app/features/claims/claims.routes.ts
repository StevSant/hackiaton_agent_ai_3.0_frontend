import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/claims-list.page').then((m) => m.ClaimsListPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/claim-detail.page').then((m) => m.ClaimDetailPage),
  },
];
