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
    MintTransaction,
    PolicyInvitations,
    PolicyDiscussion,
    PolicyComment
} from '@guardian/common';
import { ICollectionDiff, ICollectionKeys } from './../index.js';

export interface IPolicyCollectionDiff {
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
    policyInvitationsCollection?: ICollectionDiff<PolicyInvitations>;
    policyDiscussionCollection?: ICollectionDiff<PolicyDiscussion>;
    policyCommentCollection?: ICollectionDiff<PolicyComment>;
}

export interface IPolicyKeysDiff {
    uuid: string,
    type: 'keys';
    index: number;
    messageId?: string;
    lastUpdate?: Date;

    discussionsKeys?: ICollectionKeys
}

export type IPolicyDiff = IPolicyCollectionDiff | IPolicyKeysDiff;