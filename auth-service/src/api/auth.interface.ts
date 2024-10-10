import { IGroup, UserRole } from '@guardian/interfaces';

/**
 * Authenticated user interface
 */
export interface IAuthUser {
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
    /**
     * login expire date
     */
    expireAt?: number
    /**
     * Group name
     */
    permissionsGroup?: IGroup[];
    /**
     * Permissions
     */
    permissions?: string[];
}
