import { DetailsHistory } from './details.interface.js';
import { Message } from './message.details.js';

/**
 * VP options
 */
export interface VPOptions {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * Relationships
     */
    relationships: string[];
}

/**
 * VP analytics
 */
export interface VPAnalytics {
    /**
     * Text search
     */
    textSearch: string;
    /**
     * Policy message identifier
     */
    policyId: string;
    /**
     * Schema message identifiers
     */
    schemaIds: string[];
    /**
     * Schema names
     */
    schemaNames: string[];
}

/**
 * VP
 */
export type VP = Message<VPOptions, VPAnalytics>;

/**
 * VP details
 */
export type VPDetails = DetailsHistory<VP>;
