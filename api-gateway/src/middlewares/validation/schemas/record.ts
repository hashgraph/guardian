import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordStatusDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    policyId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    status: string;
}

export class RecordActionDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    policyId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    method: string;

    @ApiProperty()
    @IsString()
    action: string;

    @ApiProperty()
    @IsString()
    time: string;

    @ApiProperty()
    @IsString()
    user: string;

    @ApiProperty()
    @IsString()
    target: string;
}

export class ResultDocumentDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    schema: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    rate: string;

    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    documents: any;
}

export class ResultInfoDTO {
    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    tokens: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    documents: number;
}

export class RunningResultDTO {
    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    info: ResultInfoDTO;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    total: number;

    @ApiProperty({ type: () => ResultDocumentDTO })
    @IsArray()
    @Type(() => ResultDocumentDTO)
    documents: ResultDocumentDTO[];
}

export class RunningDetailsDTO {
    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    left: any;

    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    right: any;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    total: number;

    @ApiProperty()
    @IsObject()
    @IsNotEmpty()
    documents: any;
}