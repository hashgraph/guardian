import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Examples } from '../examples.js';

/**
 * Response shape for an Organization.
 */
export class OrganizationDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Human-readable organization name',
        required: false,
        example: 'Acme Carbon Co.'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Free-text description of the organization',
        required: false,
        example: 'Verified carbon-credit issuer for Acme group entities.'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the Standard Registry that owns the organization',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the organization (populated after publish)',
        required: false,
        example: Examples.DID_2
    })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiProperty({
        type: String,
        description: 'Vault handle for the organization wallet (server-side identifier; safe to expose)',
        required: false
    })
    @IsOptional()
    @IsString()
    walletToken?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera account ID associated with the organization (populated after publish)',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    hederaAccountId?: string;

    @ApiProperty({
        type: String,
        description: 'Hedera topic ID for the organization (populated after publish)',
        required: false,
        example: '0.0.1234567'
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: String,
        description: 'Parent topic ID (the SR / global topic) the organization topic is linked to',
        required: false,
        example: '0.0.7654321'
    })
    @IsOptional()
    @IsString()
    parentTopicId?: string;

    @ApiProperty({
        type: String,
        description: 'Lifecycle status of the organization',
        required: false,
        enum: ['DRAFT', 'PUBLISHED'],
        example: 'PUBLISHED'
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({
        type: String,
        description: 'Location of the organization record',
        required: false,
        enum: ['LOCAL', 'REMOTE'],
        example: 'LOCAL'
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;
}

/**
 * Request body for POST /organizations — creates a DRAFT record (record-layer only).
 */
export class CreateOrganizationDTO {
    @ApiProperty({
        type: String,
        description: 'Human-readable organization name (required)',
        required: true,
        example: 'Acme Carbon Co.'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        description: 'Optional free-text description',
        required: false,
        example: 'Verified carbon-credit issuer for Acme group entities.'
    })
    @IsOptional()
    @IsString()
    description?: string;
}

/**
 * Request body for PUT /organizations/:id — record-layer field updates only.
 * On-ledger fields (did, topicId, parentTopicId, hederaAccountId, status, location) are not
 * settable through this endpoint; they are hydrated by POST /organizations/:id/publish.
 */
export class UpdateOrganizationDTO {
    @ApiProperty({
        type: String,
        description: 'New organization name',
        required: false,
        example: 'Acme Carbon Co.'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'New free-text description',
        required: false,
        example: 'Verified carbon-credit issuer for Acme group entities.'
    })
    @IsOptional()
    @IsString()
    description?: string;
}

/**
 * Request body for POST /organizations/:id/publish — triggers on-ledger publish orchestration.
 * Hedera account credentials are write-only (never echoed in any response).
 */
export class PublishOrganizationDTO {
    @ApiProperty({
        type: String,
        description: 'Hedera account ID to associate with the organization (operator account)',
        required: true,
        example: Examples.ACCOUNT_ID
    })
    @IsString()
    hederaAccountId: string;

    @ApiProperty({
        type: String,
        description: 'Private key for the Hedera account (stored securely in the org wallet, never echoed)',
        required: true
    })
    @IsString()
    hederaAccountKey: string;

    @ApiProperty({
        type: String,
        description: 'Optional description override applied during publish',
        required: false,
        example: 'Verified carbon-credit issuer for Acme group entities.'
    })
    @IsOptional()
    @IsString()
    description?: string;
}

/**
 * Response shape for an OrgRole.
 */
export class OrgRoleDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Parent organization identifier',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    organizationId?: string;

    @ApiProperty({
        type: String,
        description: 'Role name (unique within the organization)',
        required: false,
        example: 'Manager'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'Free-text role description',
        required: false,
        example: 'Operators authorized to mint on behalf of the organization.'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: [String],
        description: 'Subset of TOKEN_MINTING, TOKEN_RETIREMENT, TOKEN_TRANSFER',
        required: false,
        example: ['TOKEN_MINTING', 'TOKEN_TRANSFER']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}

/**
 * Request body for POST /organizations/:id/roles.
 */
export class CreateOrgRoleDTO {
    @ApiProperty({
        type: String,
        description: 'Role name (required, unique within the organization)',
        required: true,
        example: 'Manager'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        description: 'Optional free-text description',
        required: false,
        example: 'Operators authorized to mint on behalf of the organization.'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: [String],
        description: 'Subset of TOKEN_MINTING, TOKEN_RETIREMENT, TOKEN_TRANSFER',
        required: false,
        example: ['TOKEN_MINTING']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}

/**
 * Request body for PUT /organizations/:id/roles/:roleId.
 */
export class UpdateOrgRoleDTO {
    @ApiProperty({
        type: String,
        description: 'New role name (must be unique within the organization)',
        required: false,
        example: 'Manager'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        description: 'New free-text description',
        required: false,
        example: 'Operators authorized to mint on behalf of the organization.'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        type: [String],
        description: 'New permissions list — subset of TOKEN_MINTING, TOKEN_RETIREMENT, TOKEN_TRANSFER',
        required: false,
        example: ['TOKEN_MINTING', 'TOKEN_TRANSFER']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}

/**
 * Response shape for an OrganizationMember.
 */
export class OrganizationMemberDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Parent organization identifier',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    organizationId?: string;

    @ApiProperty({
        type: String,
        description: 'Member DID',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiProperty({
        type: String,
        description: 'Underlying user identifier (auth-service User._id)',
        required: false,
        example: Examples.DB_ID_3
    })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({
        type: String,
        description: 'Username (denormalized for display)',
        required: false,
        example: 'jane.doe'
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        type: String,
        description: 'OrgRole identifier the member is enrolled in',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    orgRoleId?: string;

    @ApiProperty({
        type: String,
        description: 'OrgRole name (denormalized for display)',
        required: false,
        example: 'Manager'
    })
    @IsOptional()
    @IsString()
    orgRoleName?: string;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the membership is active',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiProperty({
        type: String,
        description: 'Identifier of the RegistrationMessage(Init) published on the org topic',
        required: false,
        example: '1700000000.000000000'
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;
}

/**
 * Request body for POST /organizations/:id/members.
 */
export class EnrollMemberDTO {
    @ApiProperty({
        type: String,
        description: 'DID of the user to enroll (must already exist as a Guardian user)',
        required: true,
        example: Examples.DID
    })
    @IsString()
    did: string;

    @ApiProperty({
        type: String,
        description: 'Identifier of the OrgRole to assign to the new member',
        required: true,
        example: Examples.DB_ID_2
    })
    @IsString()
    orgRoleId: string;
}

/**
 * Request body for PUT /organizations/:id/members/:memberId/role.
 */
export class UpdateMemberRoleDTO {
    @ApiProperty({
        type: String,
        description: 'Identifier of the new OrgRole (must belong to the same organization)',
        required: true,
        example: Examples.DB_ID_2
    })
    @IsString()
    orgRoleId: string;
}

/**
 * Request body for POST /organizations/:id/policies/assign.
 */
export class AssignPolicyToOrgDTO {
    @ApiProperty({
        type: String,
        description: 'Identifier of the policy to assign to the organization',
        required: true,
        example: Examples.DB_ID_3
    })
    @IsString()
    policyId: string;
}

/**
 * Response shape for a PolicyOrgAssignment.
 */
export class PolicyOrgAssignmentDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Organization identifier',
        required: false,
        example: Examples.DB_ID_2
    })
    @IsOptional()
    @IsString()
    organizationId?: string;

    @ApiProperty({
        type: String,
        description: 'Policy identifier',
        required: false,
        example: Examples.DB_ID_3
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: String,
        description: 'DID of the Standard Registry that created the assignment',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the assignment is currently active (false = soft-revoked)',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    assigned?: boolean;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        required: false,
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;
}
