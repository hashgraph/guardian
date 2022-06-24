import { UserRole } from "../../type/user-role.type";
import { IUser } from "../user.interface";

export interface IGetUserMessage {
    username: string;
}
export interface IGetUserByTokenMessage {
    token: string;
}
export interface IRegisterNewUserMessage {
    username: string;
    password: string;
    role: UserRole;
}
export interface IGenerateTokenMessage {
    username: string;
    password: string;
}
export interface IGenerateTokenResponse {
    username: string;
    accessToken: string;
    role: UserRole;
    did: string;
}
export interface IGetAllUserResponse {
    username: string;
    parent: string;
    did: string;
}

export interface IStandardRegistryUserResponse {
    username: string;
    did: string;
}

export interface IGetDemoUserResponse extends IGetAllUserResponse {
    role: UserRole;
}

export interface IUpdateUserMessage {
    username: string;
    item: Partial<IUser>;
}

export interface ISaveUserMessage {
    user: IUser;
}

export interface IGetUserByIdMessage {
    did: string;
}

export interface IGetUsersByIdMessage {
    dids: string[];
}

export interface IGetUsersByIRoleMessage {
    role: UserRole;
}

export interface IGetUsersByAccountMessage {
    account: string;
}