import { TokenType } from '../type/index.js';
import { RetireTokenPool } from './retire-token-pool.interface.js';

/**
 * Retire pool
 */
export class IRetirePool {
    /**
     * Id
     */
    id: string;

    /**
     * Hedera Contract Id
     */
    contractId: string;

    /**
     * Tokens
     */
    tokens: (RetireTokenPool & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
        contract: string;
    })[];

    /**
     * Token identifiers
     */
    tokenIds: string[];

    /**
     * Immediately retire
     */
    immediately: boolean;

    /**
     * Enabled
     */
    enabled: boolean;
}
