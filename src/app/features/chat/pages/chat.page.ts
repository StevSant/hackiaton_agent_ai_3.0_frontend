import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'page-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-6 py-12">
      <h1 class="text-2xl font-semibold tracking-tight">Chat</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-400">
        Chat UI will live here. Wire <code>ChatStore</code> → <code>SseClient.stream()</code> →
        <code>POST /api/v1/chat/stream</code> when the chat endpoint is built.
      </p>
    </section>
  `,
})
export class ChatPage {}
