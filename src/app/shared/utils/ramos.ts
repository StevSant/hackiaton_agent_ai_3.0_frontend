export type RamoKey = 'vehiculos' | 'salud' | 'hogar' | 'vida' | 'generales' | 'otros';

export interface RamoMeta {
  label: string;
  icon: string;
}

export const RAMOS: Record<RamoKey, RamoMeta> = {
  vehiculos: { label: 'Vehículos', icon: 'directions_car' },
  salud: { label: 'Salud', icon: 'favorite' },
  hogar: { label: 'Hogar', icon: 'home' },
  vida: { label: 'Vida', icon: 'shield' },
  generales: { label: 'Generales', icon: 'work' },
  otros: { label: 'Otros', icon: 'category' },
};

export const RAMO_KEYS: readonly RamoKey[] = [
  'vehiculos',
  'salud',
  'vida',
  'generales',
  'hogar',
  'otros',
];

/** Backend labels that should map to a catalog icon but keep their display name. */
const RAMO_ALIASES: Record<string, RamoKey> = {
  incendio: 'hogar',
  'accidentes personales': 'salud',
  transporte: 'vehiculos',
  fianzas: 'generales',
  'equipo electronico': 'generales',
};

function stripAccents(value: string): string {
  return value
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
}

function isCatalogKey(value: string): value is RamoKey {
  return value in RAMOS;
}

function resolveRamoAlias(key: string): RamoKey | null {
  if (key in RAMO_ALIASES) return RAMO_ALIASES[key];
  const stripped = stripAccents(key);
  if (stripped in RAMO_ALIASES) return RAMO_ALIASES[stripped];
  return null;
}

export function normalizeRamoKey(raw: string): RamoKey {
  const key = raw.toLowerCase().trim();
  if (!key) return 'otros';
  if (isCatalogKey(key)) return key;

  const stripped = stripAccents(key);
  if (isCatalogKey(stripped)) return stripped;

  const alias = resolveRamoAlias(key);
  if (alias) return alias;

  return 'otros';
}

/** Keeps backend display labels (Incendio, Accidentes Personales, …). */
export function ramoLabel(ramo: string): string {
  const trimmed = ramo.trim();
  if (!trimmed) return RAMOS.otros.label;

  const lookup = trimmed.toLowerCase();
  if (isCatalogKey(lookup)) return RAMOS[lookup].label;

  const stripped = stripAccents(lookup);
  if (isCatalogKey(stripped)) return RAMOS[stripped].label;

  return trimmed;
}

export function ramoIcon(ramo: string): string {
  const trimmed = ramo.trim();
  if (!trimmed) return RAMOS.otros.icon;
  return RAMOS[normalizeRamoKey(trimmed)].icon;
}
