export const CLAIM_RETURN_TO_QUERY = 'returnTo';

export const INSIGHTS_CLAIM_RETURN = {
  path: '/insights',
  label: 'Insights IA',
} as const;

export function insightsClaimReturnQuery(): Record<string, string> {
  return { [CLAIM_RETURN_TO_QUERY]: INSIGHTS_CLAIM_RETURN.path };
}

export function resolveClaimBackNavigation(
  returnTo: string | null | undefined,
  roleCode: string | null | undefined,
): { path: string; label: string } {
  if (returnTo === INSIGHTS_CLAIM_RETURN.path) {
    return INSIGHTS_CLAIM_RETURN;
  }

  if (roleCode === 'antifraude') {
    return { path: '/antifraude/bandeja', label: 'Bandeja Antifraude' };
  }

  return { path: '/claims', label: 'Bandeja' };
}
