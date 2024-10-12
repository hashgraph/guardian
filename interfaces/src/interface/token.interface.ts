import { TokenType } from '../type/token.type.js';

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
    tokenType?: TokenType;
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
     * Enable admin
     */
    enableAdmin?: boolean;
    /**
     * Enable KYC
     */
    enableKYC?: boolean;
    /**
     * Enable freeze
     */
    enableFreeze?: boolean;
    /**
     * Enable wipe
     */
    enableWipe?: boolean;
    /**
     * Change supply
     */
    changeSupply?: boolean;
    /**
     * Owner
     */
    owner?: string;
    /**
     * Owner
     */
    policyId?: string;

    /**
     * Is token draft
     */
    draftToken?: boolean;

    /**
     * Can delete
     */
    canDelete?: boolean;

    /**
     * Wipe contract identifier
     */
    wipeContractId?: string;
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
