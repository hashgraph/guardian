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
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Name'
    })
    name: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Description'
    })
    description: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DID
    })
    owner: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: permissions,
        example: [Permissions.POLICIES_POLICY_READ]
    })
    permissions: string[];
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