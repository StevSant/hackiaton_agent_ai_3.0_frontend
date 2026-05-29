/**
 * Wire shapes returned by `GET /claims/{id}`, `GET /claims`, the review action
 * endpoints and the antifraude inbox. These are thin aliases over the
 * OpenAPI-generated schema (`core/api/generated/schema.ts`) — the backend is
 * the single source of truth (root CLAUDE.md §5). The `*Dto` names are kept so
 * `core/api/` callers stay decoupled from the generated `components` shape; the
 * field definitions themselves are never hand-maintained here.
 */
import type { components } from '@core/api/generated/schema';

type S = components['schemas'];

export type ReviewStatusDto = S['ReviewStatus'];
export type DictamenOutcomeDto = S['DictamenOutcome'];
export type RiskTierDto = S['Tier'];

export type ClaimAlertDto = S['ClaimAlert'];
export type AlertSeverityDto = ClaimAlertDto['severidad'];

export type ClaimDocumentDto = S['ClaimDocument'];
export type ClaimVehicleDto = S['ClaimVehicle'];

export type ClaimTimelineEventDto = S['ClaimTimelineEvent'];
export type TimelineToneDto = ClaimTimelineEventDto['tone'];

export type ClaimReviewDto = S['ClaimReview'];
export type FactorContributionDto = S['FactorContribution'];
export type SimilarClaimDto = S['SimilarClaim'];

export type ClaimDto = S['ClaimDetail'];
export type ClaimSummaryDto = S['ClaimSummary'];
export type InboxRowDto = S['InboxRow'];
