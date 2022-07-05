import { UserRole } from '../type/user-role.type';
import { IDidObject } from './did-object.interface';
import { IVCDocument } from './vc-document.interface';

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
}
