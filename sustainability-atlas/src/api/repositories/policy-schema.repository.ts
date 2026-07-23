export interface PolicySchemaListQuery {
    page: number;
    limit: number;
    search?: string;
    schemaId?: string;
    name?: string;
    description?: string;
    sourceCid?: string;
    version?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface PolicySchemaRow {
    id: string;
    policyTopicId: string;
    messageConsensusTimestamp: string | null;
    sourceCid: string;
    schemaFile: string;
    schemaId: string;
    schemaVersion: string;
    name: string | null;
    description: string | null;
    document: Record<string, unknown> | null;
    rawSchema: Record<string, unknown>;
    lastUpdate: string;
    isProjectSchema: boolean | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PolicySchemaListResult {
    rows: PolicySchemaRow[];
    total: number;
}

export abstract class PolicySchemaRepository {
    abstract findByPolicyTopicId(
        policyTopicId: string,
        query: PolicySchemaListQuery,
    ): Promise<PolicySchemaListResult>;

    abstract findDecoded(policyTopicId: string): Promise<import('../dto/decoded-methodology.dto').DecodedMethodologyRow | null>;
}
