import { MessageAction } from '../types/message-action.type.js';
import { MessageType } from '../types/message-type.type.js';

/**
 * Parsed message
 */
export interface Message<O = any, A = any> {
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
    type: MessageType;
    /**
     * Action
     */
    action: MessageAction;
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
    /**
     * Sequence number
     */
    sequenceNumber?: number;
    /**
     * Virtual message
     */
    virtual?: boolean;
}
