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

export function ramoLabel(ramo: string): string {
  return RAMOS[ramo as RamoKey]?.label ?? ramo;
}

export function ramoIcon(ramo: string): string {
  return RAMOS[ramo as RamoKey]?.icon ?? 'work';
}

export function normalizeRamoKey(raw: string): RamoKey {
  const key = raw.toLowerCase().trim();
  if (key in RAMOS) return key as RamoKey;
  const stripped = key
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
  if (stripped in RAMOS) return stripped as RamoKey;
  return 'otros';
}
