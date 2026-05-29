/** Plain href for a claim detail page — lets anchors support ctrl/middle-click new-tab. */
export function claimHref(id: string): string {
  return `/claims/${encodeURIComponent(id)}`;
}
