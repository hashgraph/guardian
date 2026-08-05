/**
 * Optional allowlist of registry topic IDs. When set, the message processor
 * only discovers child topics from seed-topic messages whose topics appear
 * in this list. Topics discovered deeper in the tree (from non-seed topics)
 * are always allowed.
 *
 * Set via `ONLY_REGISTRY_TOPIC=0.0.123456,0.0.789012`.
 * Leave blank (default) to discover all registries.
 *
 * Resolved once per process — restart the worker to change.
 */
const allowlist: Set<string> = parseAllowlist();

function parseAllowlist(): Set<string> {
    const raw = process.env.ONLY_REGISTRY_TOPIC || '';
    return new Set(
        raw.split(',').map(s => s.trim()).filter(Boolean),
    );
}

export function isRegistryAllowlistActive(): boolean {
    return allowlist.size > 0;
}

export function isTopicAllowedFromSeed(topicId: string): boolean {
    if (allowlist.size === 0) return true;
    return allowlist.has(topicId);
}

export function getAllowedRegistryTopics(): string[] {
    return [...allowlist];
}
