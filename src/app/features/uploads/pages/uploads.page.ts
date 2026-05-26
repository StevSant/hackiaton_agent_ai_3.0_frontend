import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'page-uploads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-6 py-12">
      <h1 class="text-2xl font-semibold tracking-tight">Uploads</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-400">
        Upload flow placeholder. Wire <code>UploadsApi</code> → <code>POST /api/v1/files</code> +
        <code>SseClient.stream()</code> for ingest events.
      </p>
    </section>
  `,
})
export class UploadsPage {}
