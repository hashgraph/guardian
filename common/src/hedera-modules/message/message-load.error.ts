/**
 * Message found on Hedera but its IPFS documents could not be loaded (unpinned,
 * offline, or timed out). Carries code 422 so it surfaces as an actionable 4xx
 * rather than a generic 500 / null.
 */
export class MessageIpfsError extends Error {
    public readonly code: number;
    public readonly messageId?: string;

    constructor(messageId?: string) {
        super(`IPFS_UNAVAILABLE: IPFS data for message ${messageId} could not be retrieved. It may be unpinned or the source node is offline.`);
        this.name = 'MessageIpfsError';
        this.code = 422;
        this.messageId = messageId;
    }
}
