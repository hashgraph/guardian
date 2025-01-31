import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchBlocksDTO {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    version: string;

    @ApiProperty()
    @IsString()
    owner: string;

    @ApiProperty()
    @IsString()
    topicId: string;

    @ApiProperty()
    @IsString()
    messageId: string;

    @ApiProperty()
    @IsString()
    hash: string;

    @ApiProperty({ type: () => Object })
    @IsArray()
    @Type(() => Object)
    chains: any[];
}

export class ComparePoliciesDTO {
    @ApiProperty()
    @IsObject()
    blocks: any;

    @ApiProperty()
    @IsObject()
    groups: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    roles: any;

    @ApiProperty()
    @IsObject()
    tokens: any;

    @ApiProperty()
    @IsObject()
    topics: any;

    @ApiProperty()
    @IsObject()
    total: any;
}

export class CompareModulesDTO {
    @ApiProperty()
    @IsObject()
    blocks: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    inputEvents: any;

    @ApiProperty()
    @IsObject()
    outputEvents: any;

    @ApiProperty()
    @IsObject()
    variables: any;

    @ApiProperty()
    @IsObject()
    total: any;
}

export class CompareSchemasDTO {
    @ApiProperty()
    @IsObject()
    fields: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    total: any;
}

export class CompareDocumentsDTO {
    @ApiProperty()
    @IsObject()
    documents: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    total: any;
}

export class CompareDocumentsV2DTO {
    @ApiProperty()
    @IsObject()
    projects: CompareDocumentsDTO;

    @ApiProperty()
    @IsObject()
    presentations: CompareDocumentsDTO;
}

export class CompareToolsDTO {
    @ApiProperty()
    @IsObject()
    blocks: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    inputEvents: any;

    @ApiProperty()
    @IsObject()
    outputEvents: any;

    @ApiProperty()
    @IsObject()
    variables: any;

    @ApiProperty()
    @IsObject()
    total: any;
}