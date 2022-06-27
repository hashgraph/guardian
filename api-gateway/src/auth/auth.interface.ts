import { Request } from "express";
import WebSocket from "ws";
import { UserRole } from "@guardian/interfaces";

export interface IAuthUser {
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
}

interface AdditionalFields {
    /**
     * Associated user
     */
    user: IAuthUser
}

export type AuthenticatedRequest = Request & AdditionalFields;
export type AuthenticatedWebSocket = WebSocket & AdditionalFields;
