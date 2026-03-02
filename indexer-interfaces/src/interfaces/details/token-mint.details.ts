import { Message } from '../message.interface.js';

/**
 * Token mint search filters
 */
export interface TokenMintFilters {
    /**
     * Page index
     */
    pageIndex?: number | string;
    /**
     * Page size
     */
    pageSize?: number | string;
    /**
     * Order direction
     */
    orderDir?: string;
    /**
     * Order field
     */
    orderField?: string;
    /**
     * Keywords
     */
    keywords?: string;
    /**
     * Minimum token amount
     */
    minAmount?: string;
    /**
     * Maximum token amount
     */
    maxAmount?: string;
    /**
     * Start date (ISO 8601) for filtering by minting time
     */
    startDate?: string;
    /**
     * End date (ISO 8601) for filtering by minting time
     */
    endDate?: string;
    /**
     * Policy message identifier (methodology)
     */
    policyId?: string;
    /**
     * Token identifier
     */
    tokenId?: string;
    /**
     * Geography / region keyword
     */
    geography?: string;
    /**
     * Schema name (standard type)
     */
    schemaName?: string;
    /**
     * Issuer DID
     */
    issuer?: string;
}

/**
 * Token mint analytics
 */
export interface TokenMintAnalytics {
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
     * Token ID
     */
    tokenId?: string;
    /**
     * Token Amount
     */
    tokenAmount?: string;
}

/**
 * Token mint options
 */
export interface TokenMintOptions {
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
 * Token mint item - a VP document representing a token mint event
 */
export type TokenMint = Message<TokenMintOptions, TokenMintAnalytics>;

/**
 * Enriched token mint result with joined token and policy info
 */
export interface TokenMintResult {
    /**
     * Consensus timestamp (unique message ID)
     */
    consensusTimestamp: string;
    /**
     * Topic ID
     */
    topicId: string;
    /**
     * Token ID
     */
    tokenId: string;
    /**
     * Token name (from TokenCache)
     */
    tokenName?: string;
    /**
     * Token symbol (from TokenCache)
     */
    tokenSymbol?: string;
    /**
     * Minted amount
     */
    tokenAmount: string;
    /**
     * Parsed numeric amount for sorting
     */
    tokenAmountNumeric?: number;
    /**
     * Policy message identifier (methodology)
     */
    policyId?: string;
    /**
     * Policy description / name
     */
    policyDescription?: string;
    /**
     * Schema names (standard type)
     */
    schemaNames?: string[];
    /**
     * Issuer DID
     */
    issuer?: string;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Consensus timestamp as a date
     */
    mintDate?: string;
    /**
     * Geography (if available from project coordinates)
     */
    geography?: string;
}

/**
 * Token mint search page result with aggregated totalAmount
 */
export interface TokenMintPage {
    items: TokenMintResult[];
    pageIndex: number;
    pageSize: number;
    total: number;
    totalAmount: number;
    order?: any;
}
