import { ApiProperty } from '@nestjs/swagger';
import { ValidationErrorsDTO } from './blocks';


export class PolicyDTO {
    @ApiProperty({ type: 'string', nullable: false })
    id?: string;

    @ApiProperty({ type: 'string', nullable: false })
    _id?: string;

    @ApiProperty({ type: 'string', nullable: false })
    uuid?: string;

    @ApiProperty({ type: 'string', nullable: false })
    type?: string;

    @ApiProperty({ type: 'string', nullable: false })
    name?: string;

    @ApiProperty({ type: 'string', nullable: false })
    description?: string;

    @ApiProperty({ type: 'string', nullable: false })
    status?: string;

    @ApiProperty({ type: 'string', nullable: false })
    creator?: string;

    @ApiProperty({ type: 'string', nullable: false })
    owner?: string;

    @ApiProperty({ type: 'string', nullable: false })
    topicId?: string;

    @ApiProperty({ type: 'string', nullable: false })
    messageId?: string;

    @ApiProperty({ type: 'string', nullable: false })
    codeVersion?: string;

    @ApiProperty({ type: 'string', nullable: false })
    createDate?: string;

    @ApiProperty({ type: 'object', nullable: true })
    config?: any;

    @ApiProperty({ type: 'string', nullable: false })
    policyTag?: string;

    @ApiProperty({ type: 'string', nullable: false })
    userRole?: string;

    @ApiProperty({ type: 'string', isArray: true, nullable: false })
    userRoles?: string[];

    @ApiProperty({ type: 'string', nullable: false })
    userGroup?: string;

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    userGroups?: Object[];

    @ApiProperty({ type: 'string', nullable: false })
    version?: string;

    @ApiProperty({ type: 'string', nullable: false })
    topicDescription?: string;

    @ApiProperty({ type: 'string', isArray: true, nullable: false })
    policyRoles?: string[];

    @ApiProperty({ type: 'object', isArray: true, nullable: false })
    policyNavigation?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: false })
    policyTopics?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: false })
    policyTokens?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: false })
    policyGroups?: any[];

    @ApiProperty({ type: 'string', isArray: true, nullable: false })
    categories?: string[];

    @ApiProperty({ type: 'string', nullable: false })
    projectSchema?: string;
}

export class PolicyPreviewDTO {
    @ApiProperty({ nullable: false, required: true, type: () => PolicyDTO })
    module: PolicyDTO;

    @ApiProperty({ type: 'string', required: true })
    messageId: string;

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    schemas?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    tags?: any[];

    @ApiProperty({ type: 'string', nullable: true })
    moduleTopicId?: string;
}

export class PolicyValidationDTO {
    @ApiProperty({ nullable: false, required: true, type: () => PolicyDTO })
    policy: PolicyDTO;

    @ApiProperty({ nullable: false, required: true, type: () => ValidationErrorsDTO })
    results: ValidationErrorsDTO;
}

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
