/**
 * Comma-separated topic IDs to fully skip in the indexer pipeline:
 *   - topic-sync.processor      — no mirror-node polling
 *   - message-process.processor — no JSON parsing / message upsert
 *   - policy-decode.processor   — excluded from VC backfill subtree walks
 *
 * Set via `INDEXER_TOPIC_BLOCKLIST=0.0.1810803,0.0.1811149`.
 *
 * Resolved once per process — the env var is read at module load. Restart
 * the worker to change it.
 */
const blocklist: Set<string> = parseBlocklist();

function parseBlocklist(): Set<string> {
    const raw = process.env.INDEXER_TOPIC_BLOCKLIST || '';
    return new Set(
        raw.split(',').map(s => s.trim()).filter(Boolean),
    );
}

export function isTopicBlocked(topicId: string): boolean {
    return blocklist.has(topicId);
}

/** Snapshot of the current blocklist (mainly for logging). */
export function getBlockedTopics(): string[] {
    return [...blocklist];
}
