import { DestroyRef, Injectable, computed, signal } from '@angular/core';

export interface ShortcutHelpEntry {
  keys: string;
  label: string;
  group?: string;
}

export interface ShortcutScope {
  id: string;
  title: string;
  entries: ShortcutHelpEntry[];
}

const GLOBAL_ENTRIES: ShortcutHelpEntry[] = [
  { keys: '?', label: 'Mostrar u ocultar esta ayuda', group: 'General' },
];

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private readonly scopeStack = signal<readonly ShortcutScope[]>([]);

  readonly helpOpen = signal(false);

  readonly helpTitle = computed(() => {
    const stack = this.scopeStack();
    const pageScope = stack.findLast((scope) => scope.title !== 'Centinela IA');
    return pageScope?.title ?? stack.at(-1)?.title ?? 'Centinela IA';
  });

  readonly helpEntries = computed(() => {
    const stack = this.scopeStack();
    const pageEntries = stack.flatMap((scope) => scope.entries);
    const seen = new Set<string>();
    const merged: ShortcutHelpEntry[] = [];

    for (const entry of [...GLOBAL_ENTRIES, ...pageEntries]) {
      const key = `${entry.group ?? ''}|${entry.keys}|${entry.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }

    return merged;
  });

  readonly helpGroups = computed(() => {
    const groups = new Map<string, ShortcutHelpEntry[]>();
    for (const entry of this.helpEntries()) {
      const group = entry.group ?? 'Atajos';
      const list = groups.get(group) ?? [];
      list.push(entry);
      groups.set(group, list);
    }
    return [...groups.entries()];
  });

  registerScope(scope: Omit<ShortcutScope, 'id'>, destroyRef: DestroyRef): void {
    const entry: ShortcutScope = {
      ...scope,
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `scope_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };

    this.scopeStack.update((stack) => [...stack, entry]);
    destroyRef.onDestroy(() => {
      this.scopeStack.update((stack) => stack.filter((item) => item.id !== entry.id));
    });
  }

  toggleHelp(): void {
    this.helpOpen.update((open) => !open);
  }

  closeHelp(): void {
    this.helpOpen.set(false);
  }

  openHelp(): void {
    this.helpOpen.set(true);
  }
}
