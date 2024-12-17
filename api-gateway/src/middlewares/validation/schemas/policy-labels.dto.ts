import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { EntityStatus } from '@guardian/interfaces';

export class PolicyLabelDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        example: Examples.DB_ID
    })
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
        required: true,
        example: 'Tool name'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string;

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
        example: Examples.ACCOUNT_ID
    })
    @IsOptional()
    @IsString()
    topicId?: string;

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
        enum: EntityStatus,
        example: EntityStatus.DRAFT
    })
    @IsOptional()
    @IsString()
    status?: EntityStatus;

    @ApiProperty({
        type: 'object',
        nullable: true,
        required: false
    })
    @IsOptional()
    @IsObject()
    config?: any;
}

export class PolicyLabelRelationshipsDTO {

}

export class PolicyLabelDocumentDTO {

}

export class PolicyLabelDocumentRelationshipsDTO {

}