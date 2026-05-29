// Thin re-exports — the canonical definitions live in `@shared/models`.
// New code should import from `@shared/models` directly. This barrel exists
// only to keep feature-internal imports (`../models`) working without churn.
export type {
  Claim,
  ClaimAlert,
  AlertSeverity,
  ClaimTimelineEvent,
  TimelineTone,
  ClaimDocument,
  ClaimVehicle,
  TrendPoint,
  ClaimReview,
  ReviewStatus,
  DictamenOutcome,
  FactorContribution,
  NarrativeAnalysis,
  ExtractedEntities,
  SimilarClaim,
  AlertCatalogEntry,
} from '@shared/models';
export { ALERT_CATALOG } from '@shared/models';
