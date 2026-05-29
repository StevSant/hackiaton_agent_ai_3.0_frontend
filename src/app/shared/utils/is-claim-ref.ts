const CLAIM_REF_RE = /^(SIN|IMP|CL)-/i;

/** True when the text looks like a claim id (SIN-…, IMP-…, CL-…). */
export function isClaimRef(value: string): boolean {
  return CLAIM_REF_RE.test(value);
}
