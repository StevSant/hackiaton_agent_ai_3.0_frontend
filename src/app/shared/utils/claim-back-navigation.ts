export const CLAIM_RETURN_TO_QUERY = 'returnTo';
export const MAP_CLAIM_QUERY = 'mapClaim';

export const INSIGHTS_CLAIM_RETURN = {
  path: '/insights',
  label: 'Insights IA',
} as const;

export function insightsClaimReturnQuery(): Record<string, string> {
  return { [CLAIM_RETURN_TO_QUERY]: INSIGHTS_CLAIM_RETURN.path };
}

export function insightsMapFocusQuery(claimId: string): Record<string, string> {
  return { [MAP_CLAIM_QUERY]: claimId };
}

export function resolveClaimBackNavigation(
  returnTo: string | null | undefined,
  roleCode: string | null | undefined,
): { path: string; label: string } {
  // Honor insights sub-pages too (/insights/ciudad/…, /insights/ramo/…) —
  // back() uses navigateByUrl, so the full path incl. query string round-trips.
  if (
    returnTo === INSIGHTS_CLAIM_RETURN.path ||
    returnTo?.startsWith(`${INSIGHTS_CLAIM_RETURN.path}/`)
  ) {
    return { path: returnTo, label: INSIGHTS_CLAIM_RETURN.label };
  }

  if (roleCode === 'antifraude') {
    return { path: '/antifraude/bandeja', label: 'Bandeja Antifraude' };
  }

  return { path: '/claims', label: 'Bandeja' };
}
