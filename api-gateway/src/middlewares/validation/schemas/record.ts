import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Examples } from '../examples.js';

export class RecordStatusDTO {
    @ApiProperty({
        type: String,
        description: 'Record type (Recording or Running)',
        example: 'Recording'
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        type: String,
        description: 'Policy ID being recorded/run',
        example: Examples.DB_ID
    })
    @IsString()
    @IsNotEmpty()
    policyId: string;

    @ApiProperty({
        type: String,
        description: 'Unique identifier of the recording session',
        example: Examples.UUID
    })
    @IsString()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty({
        type: String,
        description: 'Current status of the recording/running session',
        example: 'New'
    })
    @IsString()
    @IsNotEmpty()
    status: string;
}

export class RecordActionDTO {
    @ApiProperty({
        type: String,
        description: 'Unique identifier of the action',
        example: Examples.UUID
    })
    @IsString()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty({
        type: String,
        description: 'Policy ID',
        example: Examples.DB_ID
    })
    @IsString()
    @IsNotEmpty()
    policyId: string;

    @ApiProperty({
        type: String,
        description: 'HTTP method (GET, POST, PUT, etc.)',
        example: 'POST'
    })
    @IsString()
    @IsNotEmpty()
    method: string;

    @ApiProperty({
        type: String,
        description: 'Action type',
        example: 'CreateDID'
    })
    @IsString()
    action: string;

    @ApiProperty({
        type: String,
        description: 'Timestamp when the action occurred',
        example: Examples.DATE
    })
    @IsString()
    time: string;

    @ApiProperty({
        type: String,
        description: 'User DID who performed the action',
        example: Examples.DID
    })
    @IsString()
    user: string;

    @ApiProperty({
        type: String,
        description: 'Target block or entity of the action',
        example: 'Block tag'
    })
    @IsString()
    target: string;
}

export class ResultDocumentDTO {
    @ApiProperty({
        type: String,
        description: 'Document type (VC, VP, etc.)',
        example: 'VC'
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        type: String,
        description: 'Schema identifier',
        example: Examples.UUID
    })
    @IsString()
    @IsNotEmpty()
    schema: string;

    @ApiProperty({
        type: String,
        description: 'Match rate between recorded and replayed document',
        example: '100%'
    })
    @IsString()
    @IsNotEmpty()
    rate: string;

    @ApiProperty({
        type: 'object',
        description: 'Document comparison details',
        additionalProperties: true
    })
    @IsObject()
    @IsNotEmpty()
    documents: any;
}

export class ResultInfoDTO {
    @ApiProperty({
        type: Number,
        description: 'Number of tokens involved in the run',
        example: 1
    })
    @IsNumber()
    @IsNotEmpty()
    tokens: number;

    @ApiProperty({
        type: Number,
        description: 'Number of documents created during the run',
        example: 5
    })
    @IsNumber()
    @IsNotEmpty()
    documents: number;
}

export class RunningResultDTO {
    @ApiProperty({
        description: 'Summary info about the run',
        type: () => ResultInfoDTO
    })
    @IsObject()
    @IsNotEmpty()
    info: ResultInfoDTO;

    @ApiProperty({
        type: Number,
        description: 'Total number of documents compared',
        example: 5
    })
    @IsNumber()
    @IsNotEmpty()
    total: number;

    @ApiProperty({
        description: 'Detailed document comparison results',
        type: () => ResultDocumentDTO,
        isArray: true
    })
    @IsArray()
    @Type(() => ResultDocumentDTO)
    documents: ResultDocumentDTO[];
}

export class RunningDetailsDTO {
    @ApiProperty({
        type: 'object',
        description: 'Left side (recorded) document',
        additionalProperties: true
    })
    @IsObject()
    @IsNotEmpty()
    left: any;

    @ApiProperty({
        type: 'object',
        description: 'Right side (replayed) document',
        additionalProperties: true
    })
    @IsObject()
    @IsNotEmpty()
    right: any;

    @ApiProperty({
        type: Number,
        description: 'Total number of fields compared',
        example: 10
    })
    @IsNumber()
    @IsNotEmpty()
    total: number;

    @ApiProperty({
        type: 'object',
        description: 'Detailed field-by-field comparison',
        additionalProperties: true
    })
    @IsObject()
    @IsNotEmpty()
    documents: any;
}
