import { Request } from 'express';
import WebSocket from 'ws';
import { IGroup, UserRole } from '@guardian/interfaces';

/**
 * Authenticated user interface
 */
export interface IAuthUser {
    /**
     * User id
     */
    id: string
    /**
     * User account name
     */
    username: string;
    /**
     * User role
     */
    role: UserRole;
    /**
     * User DID
     */
    did?: string;
    /**
     * Parent user DID
     */
    parent?: string;
    /**
     * Hedera account id
     */
    hederaAccountId?: string;
    /**
     * Wallet token
     */
    walletToken?: string;
    /**
     * Use fireblocks signing
     */
    useFireblocksSigning: boolean;
    /**
     * Group name
     */
    permissionsGroup?: IGroup[];
    /**
     * Permissions
     */
    permissions?: string[];
}

/**
 * Request additional fields
 */
interface AdditionalFields {
    /**
     * Associated user
     */
    user: IAuthUser
}

/**
 * Authenticated request
 */
export type AuthenticatedRequest = Request & AdditionalFields;
/**
 * Authenticated websocket
 */
export type AuthenticatedWebSocket = WebSocket & AdditionalFields;

/**
 * Provider auth user interface
 * Useful for external providers such as Google, Facebook, etc.
 */
export interface ProviderAuthUser {

    /**
     * Username
     */
    username: string;

    /**
     * Provider name
     */
    provider: string;

    /**
     * External user id (from provider)
     */
    providerId: string;

    /**
     * User role
     */
    role: UserRole;
}
