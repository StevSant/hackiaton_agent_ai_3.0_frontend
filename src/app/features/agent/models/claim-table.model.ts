import type { ClaimSummaryDto } from '@core/api/clients/claim.dto';

export interface ClaimTablePayload {
  title: string;
  mode?: string;
  rows: ClaimSummaryDto[];
}
