import { Examples } from '#middlewares';
import { LocationType, Permissions, UserRole, IUser } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { DidDocumentDTO } from './profiles.js';
import { VcDocumentDTO } from './document.dto.js';

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

export class ProfileDidDocumentRecordDTO {
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
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    did?: string;

    @ApiProperty({
        type: () => DidDocumentDTO
    })
    @IsOptional()
    document?: DidDocumentDTO;

    @ApiProperty({
        type: 'string',
        example: 'CREATE'
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: {
            type: 'string'
        },
        example: {
            Ed25519VerificationKey2018: `${Examples.DID}#did-root-key`,
            Bls12381G2Key2020: `${Examples.DID}#did-root-key-bbs`
        }
    })
    @IsOptional()
    verificationMethods?: Record<string, string>;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;
}

export class ProfileVcDocumentDTO extends VcDocumentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID,
        required: false
    })
    @IsOptional()
    @IsString()
    documentFileId?: string;

    @ApiProperty({
        type: 'string',
        isArray: true,
        example: [],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tableFileIds?: string[];
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
        enum: LocationType,
        required: false,
        example: LocationType.LOCAL,
        description: 'Whether the user account is local, remote, or custom.'
    })
    @IsOptional()
    @IsEnum(LocationType)
    location?: LocationType;

    @ApiProperty({
        type: () => ProfileDidDocumentRecordDTO,
        nullable: true
    })
    @IsOptional()
    didDocument?: ProfileDidDocumentRecordDTO;

    @ApiProperty({
        type: () => ProfileVcDocumentDTO,
        nullable: true
    })
    @IsOptional()
    vcDocument?: ProfileVcDocumentDTO;
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
        description:
            'DER-encoded private key when **importing** on the remote user account. Omit when **generating** for user flow (only `messageId`).',
        example: 'Key'
    })
    @IsOptional()
    @IsString()
    key?: string;
}