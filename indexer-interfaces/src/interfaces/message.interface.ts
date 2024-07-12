/**
 * Parsed message
 */
export interface Message<O = any, A = any> {
    /**
     * Identifier
     */
    _id: any;
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
     * Type
     */
    type: string;
    /**
     * Action
     */
    action: string;
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
    options: O;
    /**
     * Analytics
     */
    analytics?: A;
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
