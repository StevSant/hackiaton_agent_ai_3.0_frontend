import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/pages/home.page').then((m) => m.HomePage),
      },
      {
        path: 'chat',
        loadChildren: () =>
          import('./features/chat/chat.routes').then((m) => m.routes),
      },
      {
        path: 'uploads',
        loadChildren: () =>
          import('./features/uploads/uploads.routes').then((m) => m.routes),
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-shell').then((m) => m.AuthShell),
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
