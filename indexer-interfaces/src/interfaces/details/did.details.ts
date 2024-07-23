import { DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * DID options
 */
export interface DIDOptions {
    /**
     * DID
     */
    did: string;

    /**
     * Relationships
     */
    relationships: string[];
}

/**
 * DID analytics
 */
export interface DIDAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
}

/**
 * DID
 */
export type DID = Message<DIDOptions, DIDAnalytics>;

/**
 * DID Details
 */
export type DIDDetails = DetailsHistory<DID>;
