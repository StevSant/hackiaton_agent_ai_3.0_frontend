import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/network.page').then((m) => m.NetworkPage),
  },
];
