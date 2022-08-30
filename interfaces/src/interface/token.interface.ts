/**
 * Token interface
 */
export interface IToken {
    /**
     * ID
     */
    id: string;
    /**
     * Token ID
     */
    tokenId?: string;
    /**
     * Name
     */
    tokenName?: string;
    /**
     * Symbol
     */
    tokenSymbol?: string;
    /**
     * Type
     */
    tokenType?: string;
    /**
     * Decimals
     */
    decimals?: string;
    /**
     * Initial supply
     */
    initialSupply?: string;
    /**
     * Admin id
     */
    adminId?: string;
    /**
     * Admin key
     */
    adminKey?: string;
    /**
     * KYC key
     */
    kycKey?: string;
    /**
     * Freeze key
     */
    freezeKey?: string;
    /**
     * Wipe key
     */
    wipeKey?: string;
    /**
     * Supply key
     */
    supplyKey?: string;
}

/**
 * Token info interface
 */
export interface ITokenInfo extends IToken {
    /**
     * Associated
     */
    associated: boolean;
    /**
     * Balance
     */
    balance: string;
    /**
     * HBar balance
     */
    hBarBalance: string;
    /**
     * Frozen
     */
    frozen: boolean;
    /**
     * KYC
     */
    kyc: boolean;
}
