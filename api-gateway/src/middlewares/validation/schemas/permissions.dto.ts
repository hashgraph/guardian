import { Examples } from '#middlewares';
import { PermissionCategories, Permissions, PermissionsArray, PermissionEntities, PermissionActions } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean } from 'class-validator';

const permission = PermissionsArray.filter((p) => !p.disabled)[0];
const permissions = PermissionsArray.filter((p) => !p.disabled).map((p) => p.name);

export class PermissionsDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        enum: permissions,
        example: permission.name
    })
    name: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: PermissionCategories,
        example: permission.category
    })
    category: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: PermissionEntities,
        example: permission.entity
    })
    entity: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: PermissionActions,
        example: permission.action
    })
    action: string;

    @ApiProperty({
        type: 'boolean',
        required: true,
        example: permission.disabled
    })
    disabled: boolean;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: [Permissions.POLICIES_POLICY_READ]
    })
    dependOn?: string[];
}

export class RoleDTO {
    @ApiProperty({
        type: 'string',
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        description: 'Role creation date in ISO 8601 format',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        description: 'Unique universal identifier',
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        description: 'Role name',
        required: true,
        example: 'Policy User'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        description: 'Role description',
        required: true,
        example: 'Role for standard policy users'
    })
    description: string;

    @ApiProperty({
        type: 'string',
        description: 'DID of the Standard Registry who created this role',
        required: true,
        example: Examples.DID
    })
    owner: string;

    @ApiProperty({
        type: 'string',
        description: 'List of permission names assigned to this role',
        required: true,
        isArray: true,
        enum: permissions,
        example: [Permissions.POLICIES_POLICY_READ, Permissions.TOKENS_TOKEN_READ]
    })
    permissions: string[];

    @ApiProperty({
        type: 'boolean',
        description: 'Whether this is the default role for new users',
        example: false
    })
    @IsBoolean()
    default?: boolean;

    @ApiProperty({
        type: 'boolean',
        description: 'Whether the role is read-only (system role)',
        example: false
    })
    @IsBoolean()
    readonly?: boolean;
}

export class AssignPolicyDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        isArray: true,
        example: [Examples.DB_ID]
    })
    @IsArray()
    policyIds: string[];

    @ApiProperty({
        type: 'boolean',
        required: true,
        example: true
    })
    @IsBoolean()
    assign: boolean;
}