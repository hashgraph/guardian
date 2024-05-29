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
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    parent?: string;

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
        required: false
    })
    @IsOptional()
    @IsObject()
    didDocument?: any;

    @ApiProperty({
        type: 'object',
        nullable: true,
        required: false
    })
    @IsOptional()
    @IsObject()
    vcDocument?: any;
}