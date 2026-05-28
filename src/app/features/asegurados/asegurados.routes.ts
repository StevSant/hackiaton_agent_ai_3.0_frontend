import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/asegurados-list.page').then((m) => m.AseguradosListPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/asegurado-detail.page').then((m) => m.AseguradoDetailPage),
  },
];
