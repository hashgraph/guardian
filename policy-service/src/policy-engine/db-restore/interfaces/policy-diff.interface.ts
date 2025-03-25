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
    VpDocument
} from '@guardian/common';
import { ICollectionDiff } from './../index.js';

export interface IPolicyDiff {
    type?: 'backup' | 'diff';
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
}