import { TokenType } from '../type';
import { RetireTokenRequest } from './retire-token-request.interface';

/**
 * Retire request
 */
export class IRetireRequest {
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
    tokens: (RetireTokenRequest & {
        tokenSymbol: string;
        decimals: number;
        type: TokenType;
    })[];

    /**
     * Token identifiers
     */
    tokenIds: string[];

    /**
     * User
     */
    user: string;
}
