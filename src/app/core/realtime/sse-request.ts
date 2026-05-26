export interface SseRequest<TBody = unknown> {
  url: string;
  body?: TBody;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  signal?: AbortSignal;
}
