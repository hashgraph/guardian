import { Message } from '../message.interface.js';
import { RawMessage } from '../raw-message.interface.js';
import { NFT } from './nft.details.js';
import { Token } from './token.details.js';

/**
 * Deatils result
 */
export interface Details<T extends Message | NFT | Token, RT = RawMessage> {
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
    row?: RT;
    /**
     * Tags
     */
    tags?: any[];
}

/**
 * Details result with history
 */
export interface DetailsHistory<T extends Message, RT = RawMessage>
    extends Details<T, RT> {
    /**
     * Message history
     */
    history?: T[];
}

/**
 * Details result with activity
 */
export interface DetailsActivity<T extends Message, AT, RT = RawMessage>
    extends Details<T, RT> {
    /**
     * Entity activity
     */
    activity?: AT;
}

/**
 * Details with history and activity
 */
export type DetailsHistoryActivity<
    T extends Message,
    AT,
    RT = RawMessage
> = DetailsHistory<T, RT> & DetailsActivity<T, AT, RT>;
