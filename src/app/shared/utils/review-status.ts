import type { ReviewStatus } from '../../features/claims/models';

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pendiente: 'Pendiente',
  escalado: 'Escalado',
  en_revision: 'En revisión',
  dictaminado: 'Dictaminado',
  revisado_sin_escalar: 'Revisado sin escalar',
};

const REVIEW_STATUS_BADGE_CLASSES: Record<ReviewStatus, string> = {
  pendiente: 'bg-soft text-ink-2 border border-line',
  escalado: 'bg-tier-yellow-soft text-tier-yellow-ink',
  en_revision: 'bg-brand-soft text-brand-ink',
  dictaminado: 'bg-tier-green-soft text-tier-green-ink',
  revisado_sin_escalar: 'bg-soft text-ink-2 border border-line',
};

export function reviewStatusLabel(status: ReviewStatus): string {
  return REVIEW_STATUS_LABELS[status];
}

export function reviewStatusBadgeClass(status: ReviewStatus): string {
  return REVIEW_STATUS_BADGE_CLASSES[status];
}
