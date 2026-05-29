import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: ':claimId',
    loadComponent: () => import('./pages/fraud-panel.page').then((m) => m.FraudPanelPage),
  },
];
