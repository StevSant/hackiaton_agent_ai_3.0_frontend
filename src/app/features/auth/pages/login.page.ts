import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Button } from '../../../shared/ui/button';

@Component({
  selector: 'page-login',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 class="text-xl font-semibold tracking-tight">Sign in</h1>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Supabase auth (magic link + OAuth) wires up here.
      </p>
      <div class="mt-6 space-y-2">
        <ui-button>Continue with Google</ui-button>
        <ui-button variant="secondary">Continue with GitHub</ui-button>
      </div>
    </div>
  `,
})
export class LoginPage {}
