import { UserRole } from '../type/user-role.type';
import { IDidDocument } from './did-document.interface';
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
    didDocument?: IDidDocument;
    vcDocument?: IVCDocument;
    addressBook?: {
        appnetName: string;
        addressBook: string;
        didTopic: string;
        vcTopic: string;
        didServerUrl: string;
        didTopicMemo: string;
        vcTopicMemo: string;
    }
}
