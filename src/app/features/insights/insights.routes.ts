import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/insights.page').then((m) => m.InsightsPage),
    data: { viewportFit: true },
  },
  {
    path: 'ciudad/:citySlug',
    loadComponent: () => import('./pages/city-insights.page').then((m) => m.CityInsightsPage),
  },
];
