import { Injectable, computed, signal } from '@angular/core';

export interface ShortcutHelpEntry {
  keys: string;
  label: string;
  group?: string;
}

/** Catálogo fijo — la ayuda no cambia según la pantalla activa. */
const APP_SHORTCUT_CATALOG: readonly ShortcutHelpEntry[] = [
  { keys: '?', label: 'Mostrar u ocultar esta ayuda', group: 'General' },
  { keys: '1', label: 'Subir en el menú lateral', group: 'Menú' },
  { keys: '2', label: 'Bajar en el menú lateral', group: 'Menú' },
  { keys: '/', label: 'Enfocar búsqueda', group: 'Lista' },
  { keys: 'J  ·  ↑', label: 'Subir en la lista', group: 'Lista' },
  { keys: 'K  ·  ↓', label: 'Bajar en la lista', group: 'Lista' },
  { keys: 'Enter', label: 'Abrir registro seleccionado', group: 'Lista' },
  { keys: '←  ·  [', label: 'Registro anterior', group: 'Detalle' },
  { keys: '→  ·  ]', label: 'Registro siguiente', group: 'Detalle' },
  { keys: 'B  ·  Esc', label: 'Volver atrás', group: 'Detalle' },
  { keys: 'A', label: 'Preguntar a la IA', group: 'Detalle' },
];

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  readonly helpOpen = signal(false);

  readonly helpEntries = computed(() => [...APP_SHORTCUT_CATALOG]);

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
