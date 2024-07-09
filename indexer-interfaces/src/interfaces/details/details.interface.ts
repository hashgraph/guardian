import { Message } from './message.details.js';

/**
 * Deatils result
 */
export interface Details<T extends Message> {
    /**
     * Message identifier
     */
    id: string;
    /**
     * Message UUID
     */
    uuid?: string;
    /**
     * Parsed message
     */
    item?: T;
    /**
     * Raw message
     */
    row?: any;
}

/**
 * Details result with history
 */
export interface DetailsHistory<T extends Message> extends Details<T> {
    /**
     * Message history
     */
    history?: T[];
}

/**
 * Details result with activity
 */
export interface DetailsActivity<T extends Message, AT> extends Details<T> {
    /**
     * Entity activity
     */
    activity?: AT;
}

/**
 * Details with history and activity
 */
export type DetailsHistoryActivity<T extends Message, AT> = DetailsHistory<T> &
    DetailsActivity<T, AT>;
