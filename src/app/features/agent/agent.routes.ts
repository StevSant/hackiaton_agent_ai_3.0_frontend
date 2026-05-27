import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/chat.page').then((m) => m.ChatPage),
    data: { fullBleed: true },
  },
];
