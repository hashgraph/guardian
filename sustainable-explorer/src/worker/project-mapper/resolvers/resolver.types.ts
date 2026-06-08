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

export type ResolutionOutcome =
    | { status: 'resolved'; projectKey: string; method: string }
    | { status: 'pass' }
    | { status: 'reject'; reason: string };

export interface ResolvedProjectKey {
    projectKey: string;
    method: string;         // logged to debug output for observability
}
