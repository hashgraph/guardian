import { Request } from "express";
import WebSocket from "ws";
import { UserRole } from "interfaces";

export interface IAuthUser {
    username: string;
    role: UserRole;
    did?: string;
    hederaAccountId?: string;
    walletToken?: string;
}

interface AdditionalFields {
    user: IAuthUser
}

export type AuthenticatedRequest = Request & AdditionalFields;
export type AuthenticatedWebSocket = WebSocket & AdditionalFields;
