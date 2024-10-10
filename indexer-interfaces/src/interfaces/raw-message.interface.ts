/**
 * Raw message
 */
export interface RawMessage {
    /**
     * Identifier
     */
    id: string;
    /**
     * Message identifier
     */
    consensusTimestamp: string;
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
     * Message
     */
    message: string;
    /**
     * Sequence number
     */
    sequenceNumber: number;
    /**
     * Owner
     */
    owner: string;
    /**
     * Chunk identifier
     */
    chunkId: string;
    /**
     * Chunk number
     */
    chunkNumber: number;
    /**
     * Chunk total
     */
    chunkTotal: number;
    /**
     * Chunk type
     */
    type: string;
    /**
     * Data
     */
    data?: string;
}
