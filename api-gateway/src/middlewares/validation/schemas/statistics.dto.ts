import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { EntityStatus } from '@guardian/interfaces';

export class StatisticsDTO {
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
    instanceTopicId?: string;

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
        type: 'string',
        required: false,
        example: ''
    })
    @IsOptional()
    @IsString()
    method?: string;

    @ApiProperty({
        type: 'object',
        nullable: true,
        required: false
    })
    @IsOptional()
    @IsObject()
    config?: any;
}