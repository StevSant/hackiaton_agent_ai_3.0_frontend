import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
];
