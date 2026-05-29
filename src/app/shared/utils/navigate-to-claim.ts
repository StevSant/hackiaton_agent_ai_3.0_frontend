import type { Router } from '@angular/router';

import { ClaimNavigationStore } from '@core/state/claim-navigation.store';

import { CLAIM_RETURN_TO_QUERY } from './claim-back-navigation';

export function navigateToClaimDetail(
  router: Router,
  claimNavigation: ClaimNavigationStore,
  claimId: string,
  contextIds: readonly string[],
  queryParams?: Record<string, string | null | undefined>,
): void {
  claimNavigation.setContext(contextIds);

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryParams ?? {})) {
    if (value != null && value !== '') params[key] = value;
  }

  void router.navigate(['/claims', claimId], {
    queryParams: Object.keys(params).length > 0 ? params : undefined,
  });
}

export function claimDetailQueryParams(
  returnTo: string | null | undefined,
): Record<string, string> | undefined {
  if (!returnTo) return undefined;
  return { [CLAIM_RETURN_TO_QUERY]: returnTo };
}
