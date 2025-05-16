import {
    ApprovalDocument,
    BlockState,
    DidDocument,
    DocumentState,
    ExternalDocument,
    MultiDocuments,
    PolicyRoles,
    Tag,
    Token,
    Topic,
    VcDocument,
    VpDocument,
    MintRequest,
    MintTransaction
} from '@guardian/common';
import { ICollectionDiff } from './../index.js';

export interface IPolicyDiff {
    uuid: string,
    type: 'backup' | 'diff';
    index: number;
    messageId?: string;
    lastUpdate?: Date;
    vcCollection?: ICollectionDiff<VcDocument>;
    vpCollection?: ICollectionDiff<VpDocument>;
    didCollection?: ICollectionDiff<DidDocument>;
    stateCollection?: ICollectionDiff<BlockState>;
    roleCollection?: ICollectionDiff<PolicyRoles>;
    multiDocCollection?: ICollectionDiff<MultiDocuments>;
    tokenCollection?: ICollectionDiff<Token>;
    tagCollection?: ICollectionDiff<Tag>;
    docStateCollection?: ICollectionDiff<DocumentState>;
    topicCollection?: ICollectionDiff<Topic>;
    externalDocCollection?: ICollectionDiff<ExternalDocument>;
    approveCollection?: ICollectionDiff<ApprovalDocument>;
    mintRequestCollection?: ICollectionDiff<MintRequest>;
    mintTransactionCollection?: ICollectionDiff<MintTransaction>;
}