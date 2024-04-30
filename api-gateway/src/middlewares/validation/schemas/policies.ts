import { ApiProperty } from '@nestjs/swagger';

export class PolicyCategoryDTO {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    type: string;
}

/**
 * Migration config policies DTO
 */
export class MigrationConfigPoliciesDTO {
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
export class MigrationConfigDTO {
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
    @ApiProperty({ type: 'object' })
    schemas: { [key: string]: string };
    /**
     * Groups
     */
    @ApiProperty({ type: 'object' })
    groups: { [key: string]: string };
    /**
     * Roles
     */
    @ApiProperty({ type: 'object' })
    roles: { [key: string]: string };
    /**
     * Blocks
     */
    @ApiProperty({ type: 'object' })
    blocks: { [key: string]: string };
    /**
     * Tokens
     */
    @ApiProperty({ type: 'object' })
    tokens: { [key: string]: string };
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
    @ApiProperty({ type: 'object' })
    editedVCs: { [key: string]: any };
    /**
     * Retire contract identifier
     */
    @ApiProperty({
        type: 'string',
    })
    retireContractId: string;
}
