import {UserRole} from '../type/user-role.type';
import {UserState} from '../type/user-state.type';
import {IDidDocument} from './did-document.interface';
import {IVCDocument} from './vc-document.interface';

export class IUser {
    id: string;
    username: string;
    password: string;
    did: string;
    walletToken: string;
    hederaAccountId: string;
    role: UserRole;
    state: UserState;
}

export class ISession {
    username: string;
    state: UserState;
    role: UserRole;
    did?: string;
}

export interface IUserProfile {
    username: string,
    state: UserState,
    did?: string,
    walletToken: string,
    hederaAccountId: string,
    didDocument?: IDidDocument
    vcDocuments?: IVCDocument[]
}
