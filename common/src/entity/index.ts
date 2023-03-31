import { AggregateVC } from './aggregate-documents';
import { ApprovalDocument } from './approval-document';
import { Artifact } from './artifact';
import { ArtifactChunk } from './artifact-chunk';
import { BlockState } from './block-state';
import { Contract } from './contract';
import { DidDocument } from './did-document';
import { DocumentState } from './document-state';
import { DryRun } from './dry-run';
import { PolicyModule } from './module';
import { MultiDocuments } from './multi-documents';
import { MultiPolicy } from './multi-policy';
import { MultiPolicyTransaction } from './multi-policy-transaction';
import { Policy } from './policy';
import { PolicyInvitations } from './policy-invitations';
import { PolicyRoles } from './policy-roles';
import { RetireRequest } from './retire-request';
import { Schema } from './schema';
import { Settings } from './settings';
import { SplitDocuments } from './split-documents';
import { Token } from './token';
import { Topic } from './topic';
import { VcDocument } from './vc-document';
import { VpDocument } from './vp-document';

export * from './aggregate-documents';
export * from './approval-document';
export * from './artifact-chunk';
export * from './artifact';
export * from './block-state';
export * from './contract';
export * from './did-document';
export * from './document-state';
export * from './dry-run';
export * from './module';
export * from './multi-documents';
export * from './multi-policy-transaction';
export * from './multi-policy';
export * from './policy-invitations';
export * from './policy-roles';
export * from './policy';
export * from './retire-request';
export * from './schema';
export * from './settings';
export * from './split-documents';
export * from './token';
export * from './topic';
export * from './vc-document';
export * from './vp-document';
export const entities = [
    AggregateVC,
    ApprovalDocument,
    ArtifactChunk,
    Artifact,
    BlockState,
    Contract,
    DidDocument,
    DocumentState,
    DryRun,
    PolicyModule,
    MultiDocuments,
    MultiPolicyTransaction,
    MultiPolicy,
    PolicyInvitations,
    PolicyRoles,
    Policy,
    RetireRequest,
    Schema,
    Settings,
    SplitDocuments,
    Token,
    Topic,
    VcDocument,
    VpDocument,
];
