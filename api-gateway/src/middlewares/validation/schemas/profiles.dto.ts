import { Examples } from '#middlewares';
import { Permissions, UserRole, IUser } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UserDTO implements IUser {
    @ApiProperty({
        type: 'string',
        required: true,
        example: 'username'
    })
    @IsString()
    username: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: UserRole,
        example: UserRole.USER
    })
    @IsString()
    role: UserRole;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [{

        }]
    })
    @IsArray()
    permissionsGroup: any[];

    @ApiProperty({
        type: 'string',
        required: true,
        isArray: true,
        example: [Permissions.POLICIES_POLICY_READ]
    })
    @IsArray()
    permissions: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: [Examples.DID]
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    parents?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    hederaAccountId?: string;
}

export class ProfileDTO extends UserDTO {
    @ApiProperty({
        type: 'boolean',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    confirmed?: boolean;

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    failed?: boolean;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    parentTopicId?: string;

    @ApiProperty({
        type: 'object',
        nullable: true,
        additionalProperties: true
    })
    @IsOptional()
    @IsObject()
    didDocument?: any;

    @ApiProperty({
        type: 'object',
        nullable: true,
        additionalProperties: true
    })
    @IsOptional()
    @IsObject()
    vcDocument?: any;
}

export class PolicyKeyDTO {
    @ApiProperty({
        type: 'string',
        description: 'Key ID',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        description: 'Policy Message ID',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        description: 'Key owner',
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        example: 'Policy name'
    })
    @IsOptional()
    @IsString()
    policyName?: string;

    @ApiProperty({
        type: 'string',
        description: 'New key',
        example: 'Key'
    })
    @IsOptional()
    @IsString()
    key?: string;
}

export class PolicyKeyConfigDTO {
    @ApiProperty({
        type: 'string',
        description: 'Policy Message ID',
        example: Examples.MESSAGE_ID
    })
    @IsString()
    messageId: string;

    @ApiProperty({
        type: 'string',
        description: 'New key',
        example: 'Key'
    })
    @IsOptional()
    @IsString()
    key?: string;
}