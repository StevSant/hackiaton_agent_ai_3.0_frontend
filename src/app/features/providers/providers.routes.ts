import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/providers-list.page').then((m) => m.ProvidersListPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/provider-detail.page').then((m) => m.ProviderDetailPage),
  },
];
