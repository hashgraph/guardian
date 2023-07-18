import { UserRole } from '@guardian/interfaces';

/**
 * Authenticated user interface
 */
export interface IAuthUser {
    /**
     * Identifier
     */
    id: string;
    /**
     * Username
     */
    username: string;
    /**
     * Role
     */
    role: UserRole;
    /**
     * DID
     */
    did?: string;
    /**
     * Account ID
     */
    hederaAccountId?: string;
    /**
     * Wallet token
     */
    walletToken?: string;
    /**
     * Parent
     */
    parent?: string;
}
