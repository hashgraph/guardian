import { PolicyMapping } from '../../mapping/policy-pipeline.types';

export interface ResolutionContext {
    consensusTimestamp: string;
    topicId: string;
    csId: string;           // credentialSubject[0].id — always present (callers guard)
    csRef: string;          // credentialSubject[0].ref, trimmed, '' when absent
    isProjectSchemaVc: boolean;
    policyHasProjectSchemaClassification: boolean;
    policyMapping: PolicyMapping;
}

/**
 * Per-method resolution anchor, persisted to businessData.metadata so the chain
 * is traceable: M1 records the dynamic topic it merged on; M2/M3/M4 record the
 * root VC's consensus timestamp that the cs.id key was derived from.
 */
export interface ResolutionMetadata {
    dynamicTopicId?: string;
    rootVcTimestamp?: string;
}

export type ResolutionOutcome =
    | { status: 'resolved'; projectKey: string; method: string; metadata: ResolutionMetadata }
    | { status: 'pass' }
    | { status: 'reject'; reason: string };

export interface ResolvedProjectKey {
    projectKey: string;
    method: string;         // logged to debug output for observability
    metadata: ResolutionMetadata;
}
