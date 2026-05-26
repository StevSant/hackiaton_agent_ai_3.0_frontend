export type RamoKey = 'vehiculos' | 'salud' | 'hogar' | 'vida' | 'generales';

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
};

export function ramoLabel(ramo: string): string {
  return RAMOS[ramo as RamoKey]?.label ?? ramo;
}

export function ramoIcon(ramo: string): string {
  return RAMOS[ramo as RamoKey]?.icon ?? 'work';
}
