import type { Router } from '@angular/router';

import { AseguradoNavigationStore } from '@core/state/asegurado-navigation.store';

export function navigateToAseguradoDetail(
  router: Router,
  aseguradoNavigation: AseguradoNavigationStore,
  aseguradoId: string,
  contextIds: readonly string[],
): void {
  aseguradoNavigation.setContext(contextIds);
  void router.navigate(['/asegurados', aseguradoId]);
}
