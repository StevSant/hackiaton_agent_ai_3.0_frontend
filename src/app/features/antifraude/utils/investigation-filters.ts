import type { RamoKey, RiskTier } from '@shared/utils';

export type InvestigationStatusFilter =
  | 'todos'
  | 'pendiente'
  | 'escalado'
  | 'en_revision'
  | 'dictaminado'
  | 'revisado_sin_escalar';

export type InvestigationTierFilter = 'todos' | RiskTier;
export type InvestigationCategoryFilter = 'todos' | RamoKey;

export interface InvestigationFilters {
  search: string;
  tier: InvestigationTierFilter;
  ramo: InvestigationCategoryFilter;
  city: string;
  dateFrom: string;
  status: InvestigationStatusFilter;
}

export const EMPTY_INVESTIGATION_FILTERS: InvestigationFilters = {
  search: '',
  tier: 'todos',
  ramo: 'todos',
  city: '',
  dateFrom: '',
  status: 'todos',
};
