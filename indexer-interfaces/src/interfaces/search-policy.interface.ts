/**
 * Search policy blocks
 */
export interface SearchPolicyBlocks {
    /**
     * Hash
     */
    hash: string;
    /**
     * Hash map
     */
    hashMap: any;
    /**
     * Threshold
     */
    threshold: number;
}

/**
 * Search policy params
 */
export interface SearchPolicyParams {
    /**
     * Text
     */
    text?: string;
    /**
     * Mint VC count
     */
    minVcCount?: number;
    /**
     * Mint VP count
     */
    minVpCount?: number;
    /**
     * Mint tokens count
     */
    minTokensCount?: number;
    /**
     * Threshold
     */
    threshold?: number;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Blocks
     */
    blocks?: SearchPolicyBlocks;
}

/**
 * Search policy result
 */
export interface SearchPolicyResult {
    /**
     * Type
     */
    type: 'Global';
    /**
     * Topic identifier
     */
    topicId: string;
    /**
     * UUID
     */
    uuid: string;
    /**
     * Name
     */
    name: string;
    /**
     * Description
     */
    description: string;
    /**
     * Version
     */
    version: string;
    /**
     * Status
     */
    status: 'PUBLISH';
    /**
     * Message identifier
     */
    messageId: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * Text search
     */
    textSearch: string;
    /**
     * Registry identifier
     */
    registryId: string;
    /**
     * VC Count
     */
    vcCount: number;
    /**
     * VP Count
     */
    vpCount: number;
    /**
     * Tokens Count
     */
    tokensCount: number;
    /**
     * Rate
     */
    rate: number;
    /**
     * Tags
     */
    tags: string[];
}
