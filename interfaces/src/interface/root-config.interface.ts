import {RootState} from '../type/root-state.type';
import {IDidDocument} from './did-document.interface';
import {IVCDocument} from './vc-document.interface';

export interface IRootConfig {
    id: string;
    hederaAccountId: string;
    hederaAccountKey: string;
    addressBook: string;
    didTopic: string;
    vcTopic: string;
    appnetName: string;
    didServerUrl: string;
    didTopicMemo: string;
    vcTopicMemo: string;
    did: string;
    state: RootState;
}

export interface IAddressBookConfig {
    owner: string;
    addressBook: string;
    vcTopic: string;
    didTopic: string;
}
