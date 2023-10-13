import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchPoliciesDTO {
    @ApiProperty()
    @IsObject()
    target: any;

    @ApiProperty()
    @IsObject()
    result: any;
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

export class FilterSearchPoliciesDTO {
    @ApiProperty()
    @IsString()
    policyId: string;
}

export class FilterPoliciesDTO {
    @ApiProperty()
    @IsString()
    policyId1: string;

    @ApiProperty()
    @IsString()
    policyId2: string;

    @ApiProperty({ type: () => String })
    @IsArray()
    @Type(() => String)
    policyIds: string[];

    @ApiProperty()
    @IsNumber()
    eventsLvl: number;

    @ApiProperty()
    @IsNumber()
    propLvl: number;

    @ApiProperty()
    @IsNumber()
    childrenLvl: number;

    @ApiProperty()
    @IsNumber()
    idLvl: number;
}

export class FilterModulesDTO {
    @ApiProperty()
    @IsString()
    moduleId1: string;

    @ApiProperty()
    @IsString()
    moduleId2: string;

    @ApiProperty()
    @IsNumber()
    eventsLvl: number;

    @ApiProperty()
    @IsNumber()
    propLvl: number;

    @ApiProperty()
    @IsNumber()
    childrenLvl: number;

    @ApiProperty()
    @IsNumber()
    idLvl: number;
}

export class FilterSchemasDTO {
    @ApiProperty()
    @IsString()
    schemaId1: string;

    @ApiProperty()
    @IsString()
    schemaId2: string;

    @ApiProperty()
    @IsNumber()
    idLvl: number;
}

export class FilterDocumentsDTO {
    @ApiProperty()
    @IsString()
    documentId1: string;

    @ApiProperty()
    @IsString()
    documentId2: string;

    @ApiProperty({ type: () => String })
    @IsArray()
    @Type(() => String)
    documentIds: string[];
}

export class FilterToolsDTO {
    @ApiProperty()
    @IsString()
    toolId1: string;

    @ApiProperty()
    @IsString()
    toolId2: string;

    @ApiProperty({ type: () => String })
    @IsArray()
    @Type(() => String)
    toolIds: string[];
}
