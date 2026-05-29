export type { Claim, ConfianzaNivel, SavingsEstimate } from './claim.model';
export type { ClaimAlert, AlertSeverity } from './claim-alert.model';
export type { ClaimDocument } from './claim-document.model';
export type { ClaimReview, ReviewStatus, DictamenOutcome } from './claim-review.model';
export type { ClaimTimelineEvent, TimelineTone } from './claim-timeline-event.model';
export type { ClaimVehicle } from './claim-vehicle.model';
export type { FactorContribution } from './factor-contribution.model';
export type { NarrativeAnalysis, ExtractedEntities } from './narrative-analysis.model';
export type {
  PanelAnalysis,
  PanelLaneSnapshot,
  PanelConsensus,
  PanelSpecialistVerdict,
  PanelSpecialistRebuttal,
} from './panel-analysis.model';
export type { SimilarClaim } from './similar-claim.model';
export type { TrendPoint } from './trend-point.model';
export type { Provider } from './provider.model';
export type { Asegurado } from './asegurado.model';
export type { FraudRule, RuleKind } from './fraud-rule.model';
export { ALERT_CATALOG, type AlertCatalogEntry } from './alert-catalog';
