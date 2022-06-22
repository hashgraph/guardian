import { UserRole } from '../type/user-role.type';
import { IDidObject } from './did-object.interface';
import { IVCDocument } from './vc-document.interface';

export class ISession {
    username: string;
    role: UserRole;
}

export interface IUser {
    confirmed?: boolean;
    failed?: boolean;
    username?: string;
    role?: UserRole;
    hederaAccountId?: string;
    hederaAccountKey?: string;
    walletToken?: string;
    did?: string;
    topicId?: string;
    parentTopicId?: string;
    parent?: string;
    didDocument?: IDidObject;
    vcDocument?: IVCDocument;
}
