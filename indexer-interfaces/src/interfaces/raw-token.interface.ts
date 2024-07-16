/**
 * Token
 */
export class RawToken {
    /**
     * Identifier
     */
    _id: any;
    /**
     * Identifier
     */
    id!: string;
    /**
     * Token identifier
     */
    tokenId: string;
    /**
     * Status
     */
    status: string;
    /**
     * Last update
     */
    lastUpdate: number;
    /**
     * Serial number
     */
    serialNumber: number;
    /**
     * Has next
     */
    hasNext: boolean;
    /**
     * Name
     */
    name: string;
    /**
     * Symbol
     */
    symbol: string;
    /**
     * Type
     */
    type: string;
    /**
     * Treasury
     */
    treasury: string;
    /**
     * Memo
     */
    memo: string;
    /**
     * Total supply
     */
    totalSupply: any;
    /**
     * Decimals
     */
    decimals?: string;
}
