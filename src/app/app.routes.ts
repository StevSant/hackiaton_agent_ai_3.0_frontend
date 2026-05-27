import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth.guard';
import { AuthStore } from '@core/auth/auth.store';
import { roleGuard } from '@core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('@layouts/auth-shell').then((m) => m.AuthShell),
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@layouts/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        // Role-aware default landing. Routes get evaluated again after login.
        redirectTo: () => {
          const auth = inject(AuthStore);
          return auth.user()?.roleCode === 'antifraude' ? 'antifraude/bandeja' : 'claims';
        },
      },
      {
        path: 'claims',
        loadChildren: () => import('@features/claims/claims.routes').then((m) => m.routes),
      },
      {
        path: 'insights',
        loadChildren: () => import('@features/insights/insights.routes').then((m) => m.routes),
      },
      {
        path: 'antifraude',
        canActivate: [roleGuard('antifraude')],
        loadChildren: () =>
          import('@features/antifraude/antifraude.routes').then((m) => m.routes),
      },
      {
        path: 'agent',
        loadChildren: () => import('@features/agent/agent.routes').then((m) => m.routes),
      },
      {
        path: 'network',
        canActivate: [roleGuard('antifraude')],
        loadChildren: () => import('@features/network/network.routes').then((m) => m.routes),
      },
      {
        path: 'providers',
        loadChildren: () =>
          import('@features/providers/providers.routes').then((m) => m.routes),
      },
      {
        path: 'alerts',
        loadChildren: () => import('@features/alerts/alerts.routes').then((m) => m.routes),
      },
      {
        path: 'audit',
        canActivate: [roleGuard('antifraude')],
        loadChildren: () => import('@features/audit/audit.routes').then((m) => m.routes),
      },
      {
        path: 'settings',
        loadChildren: () => import('@features/settings/settings.routes').then((m) => m.routes),
      },
      {
        path: 'uploads',
        loadChildren: () => import('@features/uploads/uploads.routes').then((m) => m.routes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
