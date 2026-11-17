import { ApprovalDocument } from '@guardian/common/entity/approval-document';
import { BlockState } from '@guardian/common/entity/block-state';
import { DidDocument } from '@guardian/common/entity/did-document';
import { DocumentState } from '@guardian/common/entity/document-state';
import { ExternalDocument } from '@guardian/common/entity/external-document';
import { MultiDocuments } from '@guardian/common/entity/multi-documents';
import { PolicyRoles } from '@guardian/common/entity/policy-roles';
import { Tag } from '@guardian/common/entity/tag';
import { Token } from '@guardian/common/entity/token';
import { Topic } from '@guardian/common/entity/topic';
import { VcDocument } from '@guardian/common/entity/vc-document';
import { VpDocument } from '@guardian/common/entity/vp-document';
import { MintRequest } from '@guardian/common/entity/mint-request';
import { MintTransaction } from '@guardian/common/entity/mint-transaction';
import { PolicyInvitations } from '@guardian/common/entity/policy-invitations';
import { PolicyDiscussion } from '@guardian/common/entity/policy-discussion';
import { PolicyComment } from '@guardian/common/entity/policy-comment';
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