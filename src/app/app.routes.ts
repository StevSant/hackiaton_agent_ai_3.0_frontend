import type { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-shell').then((m) => m.AuthShell),
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'claims' },
      {
        path: 'claims',
        loadChildren: () => import('./features/claims/claims.routes').then((m) => m.routes),
      },
      {
        path: 'agent',
        loadChildren: () => import('./features/agent/agent.routes').then((m) => m.routes),
      },
      {
        path: 'network',
        loadChildren: () => import('./features/network/network.routes').then((m) => m.routes),
      },
      {
        path: 'alerts',
        loadChildren: () => import('./features/alerts/alerts.routes').then((m) => m.routes),
      },
      {
        path: 'audit',
        loadChildren: () => import('./features/audit/audit.routes').then((m) => m.routes),
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.routes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
