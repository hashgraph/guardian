import { IPolicyDocumentationEntry, POLICY_ALIAS_REGEX } from '@guardian/interfaces';

/**
 * Build technical and DMRV URLs for user-configured documentation entries.
 * Called on policy save to enrich entries with generated URLs.
 */
export function buildDocumentationUrls(
    policyId: string,
    entries: IPolicyDocumentationEntry[]
): IPolicyDocumentationEntry[] {
    if (!Array.isArray(entries)) {
        return [];
    }
    return entries.map((entry) => {
        const tag = entry.target;
        const alias = entry.alias;
        if (!alias || !POLICY_ALIAS_REGEX.test(alias)) {
            throw new Error(
                `Invalid alias "${alias}" — only lowercase letters, digits, hyphens; segments separated by '/'.`
            );
        }
        const technicalUrl = `/api/v1/policies/${policyId}/tag/${tag}/blocks`;
        const dmrvUrl = `/api/v1/dmrv/${policyId}/${alias}`;
        return {
            ...entry,
            url: technicalUrl,
            dmrvUrl,
        };
    });
}
