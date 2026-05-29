import { Injectable, signal } from '@angular/core';

const SESSION_KEY = 'centinela:claim-nav-ids:v1';

export interface ClaimNavigationNeighbors {
  prevId: string | null;
  nextId: string | null;
  position: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ClaimNavigationStore {
  private readonly _orderedIds = signal<readonly string[]>(this.readSession());

  setContext(orderedIds: readonly string[]): void {
    const unique = [...new Set(orderedIds.filter(Boolean))];
    this._orderedIds.set(unique);
    this.writeSession(unique);
  }

  getOrderedIds(fallbackOrderedIds: readonly string[] = []): readonly string[] {
    const primary = this._orderedIds();
    return primary.length > 0 ? primary : fallbackOrderedIds;
  }

  resolve(currentId: string, fallbackOrderedIds: readonly string[] = []): ClaimNavigationNeighbors {
    const ids = this.getOrderedIds(fallbackOrderedIds);
    const total = ids.length;
    const index = ids.indexOf(currentId);

    if (index === -1 || total === 0) {
      return { prevId: null, nextId: null, position: 0, total: 0 };
    }

    return {
      prevId: index > 0 ? ids[index - 1]! : null,
      nextId: index < total - 1 ? ids[index + 1]! : null,
      position: index + 1,
      total,
    };
  }

  private readSession(): readonly string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeSession(ids: readonly string[]): void {
    if (typeof window === 'undefined') return;
    try {
      if (ids.length === 0) {
        window.sessionStorage.removeItem(SESSION_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
      }
    } catch {
      // quota / private mode — ignore
    }
  }
}
