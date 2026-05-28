import type { InvestigationFilters } from './investigation-filters';

export interface SavedFilter {
  id: string;
  name: string;
  filters: InvestigationFilters;
  createdAt: string;
}

interface StoredPayload {
  v: 1;
  items: SavedFilter[];
}

const STORAGE_KEY = 'centinela.investigacion.savedFilters';
const MAX_ENTRIES = 20;

export function loadSavedFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    if (parsed?.v !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(isValidEntry);
  } catch {
    console.warn('[saved-filters] failed to parse localStorage payload — resetting.');
    return [];
  }
}

export function saveSavedFilter(name: string, filters: InvestigationFilters): SavedFilter | null {
  if (typeof window === 'undefined') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const entry: SavedFilter = {
    id: newId(),
    name: trimmed,
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadSavedFilters().filter((e) => e.name !== trimmed)].slice(
    0,
    MAX_ENTRIES,
  );
  persist(next);
  return entry;
}

export function deleteSavedFilter(id: string): void {
  if (typeof window === 'undefined') return;
  const next = loadSavedFilters().filter((e) => e.id !== id);
  persist(next);
}

function persist(items: SavedFilter[]): void {
  try {
    const payload: StoredPayload = { v: 1, items };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    console.warn('[saved-filters] localStorage write failed (quota or private mode).');
  }
}

function isValidEntry(value: unknown): value is SavedFilter {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SavedFilter>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.createdAt === 'string' &&
    !!v.filters &&
    typeof v.filters === 'object'
  );
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
