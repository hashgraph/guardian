/**
 * Raw topic
 */
export class RawTopic {
    /**
     * Identifier
     */
    _id: any;
    /**
     * Identifier
     */
    id!: string;
    /**
     * Topic identifier
     */
    topicId: string;
    /**
     * Status
     */
    status: string;
    /**
     * Last update
     */
    lastUpdate: number;
    /**
     * Messages
     */
    messages: number;
    /**
     * Has next
     */
    hasNext: boolean;
}
