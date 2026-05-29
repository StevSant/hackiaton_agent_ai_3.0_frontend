import type { Router } from '@angular/router';

import { ProviderNavigationStore } from '@core/state/provider-navigation.store';

export function navigateToProviderDetail(
  router: Router,
  providerNavigation: ProviderNavigationStore,
  providerId: string,
  contextIds: readonly string[],
): void {
  providerNavigation.setContext(contextIds);
  void router.navigate(['/providers', providerId]);
}
