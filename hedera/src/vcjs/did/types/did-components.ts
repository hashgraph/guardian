/**
 * DID components
 */
export interface IDidComponents {
    /**
     * DID prefix
     */
    readonly prefix: string;
    /**
     * DID method
     */
    readonly method: string;
    /**
     * DID identifier
     */
    readonly identifier: string;
}

/**
 * Hedera DID components
 */
export interface HederaDidComponents extends IDidComponents {
    /**
     * Hedera network
     */
    readonly network: string;
    /**
     * Hedera identifier
     */
    readonly key: string;
    /**
     * Hedera topic
     */
    readonly topicId: string;
}