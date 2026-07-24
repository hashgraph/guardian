/**
 * `credentialSubject[0].type` prefixes that identify VCs which are NEVER
 * project credentials. Used in two places that need to agree:
 *
 *   1. `ipfs-fetch.processor` — suppresses the "no usable policy id" warning,
 *      since these VCs legitimately carry no policyId.
 *   2. `project-mapper.service.upsertProjectFromVc` — skips early so role
 *      assignments / registry profiles / mint receipts never seed phantom
 *      project rows keyed by their own cs.id.
 *
 * Matched by `String.startsWith` so versioned variants are caught (e.g.
 * `MintToken&1.0.0`, `StandardRegistry_v2`).
 */
export const NON_PROJECT_CS_TYPE_PREFIXES: readonly string[] = [
    'StandardRegistry',
    'MintToken',
    'UserRole',
    'SystemRole', 
    'UserPermissions'
];

export function isNonProjectCsType(rawType: string | null | undefined): boolean {
    if (!rawType) return false;
    return NON_PROJECT_CS_TYPE_PREFIXES.some(p => rawType.startsWith(p));
}
