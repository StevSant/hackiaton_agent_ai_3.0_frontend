/**
 * Generic pagination envelope returned by every backend list endpoint.
 * Mirrors `app.schemas.page.Page[T]` (backend) exactly.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
