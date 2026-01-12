import { DetailsHistory } from './details.interface.js';
import { Message } from '../message.interface.js';

/**
 * VC options
 */
export interface VCOptions {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * Relationships
     */
    relationships: string[];
    /**
     * Document status
     */
    documentStatus: string;
    /**
     * Encoded data
     */
    encodedData: boolean;
}

/**
 * VC analytics
 */
export interface VCAnalytics {
    /**
     * Text search
     */
    textSearch?: string;
    /**
     * Policy message identifier
     */
    policyId?: string;
    /**
     * Schema message identifier
     */
    schemaId?: string;
    /**
     * Schema name
     */
    schemaName?: string;
}

/**
 * VC
 */
export type VC = Message<VCOptions, VCAnalytics>;

/**
 * VC details
 */
export type VCDetails = DetailsHistory<VC> & {
    schema?: any,
    formulasData?: {
        document: any,
        policy: any,
        formulas: any[],
        relationships: any[],
        schemas: any[]
    },
    versions?: any[]
};
