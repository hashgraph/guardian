/**
 * Server-side HashScan verification-URL builder and source-system label mapper for the ESG/compliance export
 * engine's Traceability References group. Mirrors the client-side URL construction in
 * `frontend/components/project/HederaReferences.vue`, but built server-side so generated export files are
 * self-contained. Pure utility: no SQL, no I/O.
 */

/** Identifiers available for a single export row, in resolution precedence order. */
export interface VerificationIdentifiers {
    /**
     * Hedera consensus timestamp of the mint/issuance transaction
     * (`seconds.nanoseconds`). Backs `transaction_id` — never the token ID.
     */
    consensusTimestamp?: string | null;
    /** Hedera token ID (`0.0.x`). Backs `registry_record_id`. */
    tokenId?: string | null;
    /** Hedera topic ID (`0.0.x`) — registry/policy/instance topic. */
    topicId?: string | null;
}

const HASHSCAN_BASE_URL = 'https://hashscan.io';

/**
 * Builds a network-scoped HashScan verification URL, preferring the token page
 * (token > transaction > topic). The token page always resolves on HashScan and
 * shows the token plus its mint transactions, so it's the reliable verification
 * target; a bare `/transaction/{consensusTimestamp}` URL does NOT reliably
 * resolve on HashScan (it redirects to the network home), so it's only used when
 * no token is known, then the topic. Returns an empty string when neither
 * `network` nor any identifier is available — callers must not fabricate a URL.
 */
export function buildVerificationUrl(network: string, ids: VerificationIdentifiers): string {
    if (!network) return '';

    if (ids.tokenId) {
        return `${HASHSCAN_BASE_URL}/${network}/token/${ids.tokenId}`;
    }
    if (ids.consensusTimestamp) {
        return `${HASHSCAN_BASE_URL}/${network}/transaction/${ids.consensusTimestamp}`;
    }
    if (ids.topicId) {
        return `${HASHSCAN_BASE_URL}/${network}/topic/${ids.topicId}`;
    }
    return '';
}

/**
 * Display labels for `message.dataSource`
 * (`src/shared/entities/message.entity.ts`) values, used for the
 * `source_system_id` export column. Anything not listed here (including
 * `null`/`undefined`/unrecognized values) falls back to
 * `DEFAULT_SOURCE_SYSTEM_LABEL`.
 */
const SOURCE_SYSTEM_LABELS: Record<string, string> = {
    mirror_node: 'Hedera Mirror Node',
    guardian_api: 'Guardian API',
    both: 'Hedera Mirror Node + Guardian API',
};

/** Default label when `message.dataSource` is missing or unrecognized. */
export const DEFAULT_SOURCE_SYSTEM_LABEL = 'Hedera Guardian';

/**
 * Maps a `message.dataSource` value (`mirror_node` | `guardian_api` | `both`)
 * to its `source_system_id` display label, defaulting to
 * `DEFAULT_SOURCE_SYSTEM_LABEL` ("Hedera Guardian") for any other value.
 */
export function sourceSystemLabel(dataSource?: string | null): string {
    if (!dataSource) return DEFAULT_SOURCE_SYSTEM_LABEL;
    return SOURCE_SYSTEM_LABELS[dataSource] ?? DEFAULT_SOURCE_SYSTEM_LABEL;
}
