import { ApiProperty } from '@nestjs/swagger';
import {
    MigrationConfig,
    MigrationConfigPolicies,
    MigrationFailedItem,
    MigrationMode,
    MigrationRunStatus,
    MigrationRunStatusItem,
    MigrationRunSummary,
    MigrationRunsResponse,
    MigrationStatusResponse
} from '@guardian/interfaces';

/**
 * Migration config policies DTO
 */
export class MigrationConfigPoliciesDTO implements MigrationConfigPolicies {
    /**
     * Source policy
     */
    @ApiProperty()
    src: string;
    /**
     * Destination policy
     */
    @ApiProperty()
    dst: string;
}

/**
 * Migration config DTO
 */
export class MigrationConfigDTO implements MigrationConfig {
    /**
     * Policies
     */
    @ApiProperty({ type: () => MigrationConfigPoliciesDTO })
    policies: MigrationConfigPoliciesDTO;
    /**
     * VC documents
     */
    @ApiProperty({ type: [String] })
    vcs: string[];
    /**
     * VP documents
     */
    @ApiProperty({ type: [String] })
    vps: string[];
    /**
     * Schemas
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }  })
    schemas: { [key: string]: string };
    /**
     * Groups
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    groups: { [key: string]: string };
    /**
     * Roles
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    roles: { [key: string]: string };
    /**
     * Blocks
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    blocks: { [key: string]: string };
    /**
     * Tokens
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    tokens: { [key: string]: string };
    /**
     * Tokens map
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    tokensMap: { [key: string]: string };
    /**
     * Migrate state
     */
    @ApiProperty({ type: 'boolean' })
    migrateState: boolean;
    /**
     * Migrate retire pools
     */
    @ApiProperty({ type: 'boolean' })
    migrateRetirePools: boolean;
    /**
     * Edited VCs
     */
    @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
    editedVCs: { [key: string]: any };
    /**
     * Retire contract identifier
     */
    @ApiProperty({
        type: 'string',
    })
    retireContractId: string;

    /**
     * Migration launch mode.
     * Backward compatible: if omitted, start_new is used.
     */
    @ApiProperty({
        enum: MigrationMode,
        required: false,
        default: MigrationMode.START_NEW,
    })
    mode?: MigrationMode;

    /**
     * Existing run identifier.
     * Required for resume/retry_failed modes.
     */
    @ApiProperty({
        type: 'string',
        required: false,
    })
    runId?: string;
}

export class MigrationFailedItemDTO implements MigrationFailedItem {
    @ApiProperty({ type: 'string' })
    srcPolicyId: string;

    @ApiProperty({ type: 'string' })
    dstPolicyId: string;

    @ApiProperty({ type: 'string' })
    entityType: string;

    @ApiProperty({ type: 'string' })
    srcEntityId: string;

    @ApiProperty({ type: 'string' })
    runId: string;

    @ApiProperty({ type: 'number' })
    attemptCount: number;

    @ApiProperty({ type: 'string', nullable: true })
    errorCode?: string;

    @ApiProperty({ type: 'string', nullable: true })
    errorMessage?: string;

    @ApiProperty({ type: 'string', format: 'date-time' })
    firstFailedAt: string;

    @ApiProperty({ type: 'string', format: 'date-time' })
    lastFailedAt: string;
}

export class MigrationRunStatusDTO implements MigrationRunStatusItem {
    @ApiProperty({ type: 'string' })
    runId: string;

    @ApiProperty({ type: 'string' })
    srcPolicyId: string;

    @ApiProperty({ type: 'string' })
    dstPolicyId: string;

    @ApiProperty({ enum: MigrationRunStatus })
    status: MigrationRunStatus | string;

    @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
    startedAt?: string | null;

    @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
    finishedAt?: string | null;

    @ApiProperty({ type: 'object', additionalProperties: true })
    summary: MigrationRunSummary;

    @ApiProperty({ type: () => MigrationFailedItemDTO, isArray: true, required: false })
    failedItems?: MigrationFailedItemDTO[];
}

export class MigrationRunsResponseDTO implements MigrationRunsResponse {
    @ApiProperty({ type: () => MigrationRunStatusDTO, isArray: true })
    items: MigrationRunStatusDTO[];

    @ApiProperty({ type: 'number' })
    count: number;

    @ApiProperty({ type: 'number' })
    pageIndex: number;

    @ApiProperty({ type: 'number' })
    pageSize: number;
}

export class MigrationStatusResponseDTO implements MigrationStatusResponse {
    @ApiProperty({ type: () => MigrationRunStatusDTO, isArray: true })
    items: MigrationRunStatusDTO[];
}
