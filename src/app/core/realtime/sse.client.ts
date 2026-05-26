import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { AppError } from '../errors/app-error';
import type { SseRequest } from './sse-request';

@Injectable({ providedIn: 'root' })
export class SseClient {
  private readonly auth = inject(AuthStore);

  stream<TEvent>(request: SseRequest): Observable<TEvent> {
    return new Observable<TEvent>((subscriber) => {
      const controller = new AbortController();
      const signal = request.signal ?? controller.signal;

      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        ...(request.headers ?? {}),
      };
      const token = this.auth.accessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const hasBody = request.body !== undefined;
      if (hasBody) {
        headers['Content-Type'] = 'application/json';
      }

      void this.consume<TEvent>(
        {
          url: request.url,
          method: request.method ?? (hasBody ? 'POST' : 'GET'),
          headers,
          body: hasBody ? JSON.stringify(request.body) : undefined,
          signal,
        },
        subscriber,
      );

      return () => controller.abort();
    });
  }

  private async consume<TEvent>(
    init: { url: string; method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
    subscriber: { next: (e: TEvent) => void; error: (e: unknown) => void; complete: () => void },
  ): Promise<void> {
    try {
      const response = await fetch(init.url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        credentials: 'include',
        signal: init.signal,
      });

      if (!response.ok || !response.body) {
        throw new AppError('sse_failed', `SSE stream failed (${response.status})`, response.status);
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          subscriber.complete();
          return;
        }
        buffer += value;

        let separatorIndex: number;
        while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;
          subscriber.next(JSON.parse(payload) as TEvent);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        subscriber.complete();
        return;
      }
      subscriber.error(err);
    }
  }
}
