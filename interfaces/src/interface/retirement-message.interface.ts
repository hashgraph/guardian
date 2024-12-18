/**
 * Contract
 */
export class IRetirementMessage {
    /**
     * Identifier
     */
    id: string;
    /**
     * Topic identifier
     */
    topicId: string;
    /**
     * Message identifier
     */
    consensusTimestamp: string;
    /**
     * Owner
     */
    owner: string;
    /**
     * UUID
     */
    uuid: string;
    /**
     * Status
     */
    status: string;
    /**
     * Status reason
     */
    statusReason: string;
    /**
     * Lang
     */
    lang: string;
    /**
     * Response type
     */
    responseType: string;
    /**
     * Status message
     */
    statusMessage: string;
    /**
     * Options
     */
    options: any;
    /**
     * Analytics
     */
    analytics?: any;
    /**
     * Files
     */
    files: string[];
    /**
     * Documents
     */
    documents: any[];
    /**
     * Topics
     */
    topics: string[];
    /**
     * Tokens
     */
    tokens: string[];
}
