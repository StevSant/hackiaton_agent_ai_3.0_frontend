import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../../shared/ui/button';

@Component({
  selector: 'page-home',
  standalone: true,
  imports: [RouterLink, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-6 py-20 text-center">
      <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
        Hackiaton 3.0 · Agent AI
      </span>
      <h1 class="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Multi-agent AI scaffolding.
        <span class="text-brand-600">Ready when the challenge drops.</span>
      </h1>
      <p class="mt-4 text-pretty text-slate-600 dark:text-slate-400">
        FastAPI + LangGraph backend, Angular signals frontend, SSE streaming and RAG wired end-to-end.
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <a routerLink="/chat">
          <ui-button>
            Open chat
            <span class="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span>
          </ui-button>
        </a>
        <a routerLink="/uploads">
          <ui-button variant="secondary">Upload a document</ui-button>
        </a>
      </div>
    </section>
  `,
})
export class HomePage {}
