import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/uploads.page').then((m) => m.UploadsPage),
  },
];
