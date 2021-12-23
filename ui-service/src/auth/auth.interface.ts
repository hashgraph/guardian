import { Request } from "express";
import WebSocket from "ws";
import { UserRole } from "interfaces";

export interface IAuthUser {
    username: string;
    did: string;
    role: UserRole
}

interface AdditionalFields {
    user: IAuthUser
}

export type AuthenticatedRequest = Request & AdditionalFields;
export type AuthenticatedWebSocket = WebSocket & AdditionalFields;
