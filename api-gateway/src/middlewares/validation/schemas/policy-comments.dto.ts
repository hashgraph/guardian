import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { VcDTO } from './document.dto.js';

export class PolicyCommentUserDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Administrator'
    })
    @IsString()
    label: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Administrator'
    })
    @IsString()
    value: string;

    @ApiProperty({
        type: 'string',
        required: true,
        enum: ['all', 'role', 'user'],
        example: 'role'
    })
    @IsString()
    type: 'all' | 'role' | 'user';
}

export class PolicyCommentRelationshipDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Description'
    })
    @IsString()
    label: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.MESSAGE_ID
    })
    @IsString()
    value: string;
}

export class NewPolicyDiscussionDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Common'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'
    })
    @IsOptional()
    @IsString()
    field?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Field name'
    })
    @IsOptional()
    @IsString()
    fieldName?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        enum: ['public', 'roles', 'users'],
        example: 'public'
    })
    @IsOptional()
    @IsString()
    privacy?: 'public' | 'roles' | 'users';

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    roles?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    users?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.MESSAGE_ID]
    })
    @IsOptional()
    @IsArray()
    relationships?: string[];
}

@ApiExtraModels(VcDTO)
export class PolicyDiscussionDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    target?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    targetId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: 'string',
        required: false,
    })
    @IsOptional()
    @IsString()
    hash?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Common'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'
    })
    @IsOptional()
    @IsString()
    field?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Field name'
    })
    @IsOptional()
    @IsString()
    fieldName?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.MESSAGE_ID]
    })
    @IsOptional()
    @IsArray()
    relationships?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.DB_ID]
    })
    @IsOptional()
    @IsArray()
    relationshipIds?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        enum: ['public', 'roles', 'users'],
        example: 'public'
    })
    @IsOptional()
    @IsString()
    privacy?: 'public' | 'roles' | 'users';

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    roles?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    users?: string[];

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    system?: boolean;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    count?: number;

    @ApiProperty({ nullable: false, required: true, type: () => VcDTO })
    document: VcDTO;
}

export class NewPolicyCommentDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    anchor?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.DID]
    })
    @IsOptional()
    @IsArray()
    recipients?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1']
    })
    @IsOptional()
    @IsArray()
    fields?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'text'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: ['text']
    })
    @IsOptional()
    @IsArray()
    files?: string[];
}

export class PolicyCommentSearchDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: 'text'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: '#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1'
    })
    @IsOptional()
    @IsString()
    field?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    lt?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    gt?: string;
}

@ApiExtraModels(VcDTO)
export class PolicyCommentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    uuid?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    creator?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    policyId?: string;

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
    policyTopicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    policyInstanceTopicId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    target?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    targetId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    discussionMessageId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    discussionId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 1759493933458
    })
    @IsOptional()
    @IsNumber()
    timestamp?: number;

    @ApiProperty({
        type: 'string',
        required: false,
    })
    @IsOptional()
    @IsString()
    hash?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    sender?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Administrator'
    })
    @IsOptional()
    @IsString()
    senderRole?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'StandardRegistry'
    })
    @IsOptional()
    @IsString()
    senderName?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: [Examples.DID]
    })
    @IsOptional()
    @IsArray()
    recipients?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1']
    })
    @IsOptional()
    @IsArray()
    fields?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'text'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({ nullable: false, required: true, type: () => VcDTO })
    document: VcDTO;
}

export class PolicyCommentCountDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        isArray: true,
        example: ['#150e3357-f6d2-4cd6-a69e-f9d911f8bbc7&1.0.0/field1.field1']
    })
    @IsOptional()
    @IsArray()
    fields?: string[];

    @ApiProperty({
        type: 'string',
        required: false,
        example: 0
    })
    @IsOptional()
    @IsNumber()
    count?: number;
}