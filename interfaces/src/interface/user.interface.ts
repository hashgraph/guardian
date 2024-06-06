import { UserRole } from '../type/user-role.type.js';
import { IDidObject } from './did-object.interface.js';
import { IVCDocument } from './vc-document.interface.js';

/**
 * Session interface
 */
export class ISession {
    /**
     * Username
     */
    username: string;
    /**
     * User role
     */
    role: UserRole;
}

export interface IGroup {
    /**
     * Role UUID
     */
    uuid: string,
    /**
     * Role ID
     */
    roleId: string,
    /**
     * Role name
     */
    roleName: string,
    /**
     * Owner DID
     */
    owner: string
}

/**
 * User interface
 */
export interface IUser {
    /**
     * Was confirmed
     */
    confirmed?: boolean;

    /**
     * Was failed
     */
    failed?: boolean;

    /**
     * Username
     */
    username?: string;

    /**
     * Role
     */
    role?: UserRole;

    /**
     * Hedera account id
     */
    hederaAccountId?: string;

    /**
     * Hedera account private key
     */
    hederaAccountKey?: string;

    /**
     * Wallet token
     */
    walletToken?: string;

    /**
     * DID
     */
    did?: string;

    /**
     * Topic ID
     */
    topicId?: string;

    /**
     * Parent topic ID
     */
    parentTopicId?: string;

    /**
     * Parent
     */
    parent?: string;

    /**
     * DID document instance
     */
    didDocument?: IDidObject;

    /**
     * VC document instance
     */
    vcDocument?: IVCDocument;

    /**
     * Group name
     */
    permissionsGroup?: IGroup[];

    /**
     * Permissions
     */
    permissions?: string[];
}
