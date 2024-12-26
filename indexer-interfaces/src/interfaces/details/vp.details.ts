import { DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';
import { Label } from './label.details.js';

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
    textSearch?: string;
    /**
     * Policy message identifier
     */
    policyId?: string;
    /**
     * Schema message identifiers
     */
    schemaIds?: string[];
    /**
     * Schema names
     */
    schemaNames?: string[];
    /**
     * Issuer
     */
    issuer?: string;
    /**
     * Token
     */
    tokenId?: string;
    /**
     * Label
     */
    labelName?: string;
    /**
     * Token Amount
     */
    tokenAmount?: string;
    /**
     * Labels
     */
    labels?: string[];
}

/**
 * VP
 */
export type VP = Message<VPOptions, VPAnalytics>;

/**
 * VP details
 */
export interface VPDetails extends DetailsHistory<VP> {
    labels?: VP[];
}
