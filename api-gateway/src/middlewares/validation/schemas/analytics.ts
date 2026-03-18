import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { Examples } from '../examples.js';

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

export class ComparePoliciesItemDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        example: 'Test_Policy_2'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        example: ''
    })
    @IsString()
    description: string;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: '0.0.8264622'
    })
    @IsOptional()
    @IsString()
    instanceTopicId?: string | null;

    @ApiProperty({
        type: String,
        required: false,
        example: '1'
    })
    @IsOptional()
    @IsString()
    version?: string;

    @ApiProperty({
        type: String,
        example: 'id'
    })
    @IsString()
    type: string;
}

export class ComparePoliciesColumnDTO {
    @ApiProperty({
        type: String,
        example: 'left_name'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        example: 'Name'
    })
    @IsString()
    label: string;

    @ApiProperty({
        type: String,
        example: 'string'
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Rate'
    })
    @IsOptional()
    @IsString()
    display?: string;
}

export class ComparePoliciesPropertyValueDTO {
    @ApiProperty({
        type: String,
        example: 'onErrorAction'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: Number,
        example: 1
    })
    @IsNumber()
    lvl: number;

    @ApiProperty({
        type: String,
        example: 'onErrorAction'
    })
    @IsString()
    path: string;

    @ApiProperty({
        type: String,
        example: 'property'
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: Object,
        description: 'Arbitrary property value'
    })
    value: any;
}

export class ComparePoliciesBlockSideDTO {
    @ApiProperty({
        type: Number,
        example: 1
    })
    @IsNumber()
    index: number;

    @ApiProperty({
        type: String,
        example: 'interfaceContainerBlock'
    })
    @IsString()
    blockType: string;

    @ApiProperty({
        type: String,
        example: 'Block_1'
    })
    @IsString()
    tag: string;

    @ApiProperty({
        type: ComparePoliciesPropertyValueDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesPropertyValueDTO)
    properties: ComparePoliciesPropertyValueDTO[];

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Block events payloads'
    })
    @IsArray()
    events: any[];
}

export class ComparePoliciesRateEntryDTO {
    @ApiProperty({
        type: String,
        example: 'FULL'
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: Number,
        example: 100
    })
    @IsNumber()
    totalRate: number;

    @ApiProperty({
        type: Object,
        isArray: true,
        description: 'Pair of compared values, can include null'
    })
    @IsArray()
    items: any[];

    @ApiProperty({
        type: String,
        required: false,
        example: 'type'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'uiMetaData.type'
    })
    @IsOptional()
    @IsString()
    path?: string;

    @ApiProperty({
        type: Number,
        required: false,
        example: 2
    })
    @IsOptional()
    @IsNumber()
    lvl?: number;
}

/* tslint:disable:variable-name */
export class ComparePoliciesBlocksReportRowDTO {
    @ApiProperty({
        type: Number,
        required: false,
        example: 1
    })
    @IsOptional()
    @IsNumber()
    lvl?: number;

    @ApiProperty({
        type: String,
        required: false,
        example: 'PARTLY'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'interfaceContainerBlock'
    })
    @IsOptional()
    @IsString()
    block_type?: string;

    @ApiProperty({
        type: Number,
        required: false,
        example: 1
    })
    @IsOptional()
    @IsNumber()
    left_index?: number;

    @ApiProperty({
        type: String,
        required: false,
        example: 'interfaceContainerBlock'
    })
    @IsOptional()
    @IsString()
    left_type?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Block_1'
    })
    @IsOptional()
    @IsString()
    left_tag?: string;

    @ApiProperty({
        type: Number,
        required: false,
        example: 1
    })
    @IsOptional()
    @IsNumber()
    right_index?: number;

    @ApiProperty({
        type: String,
        required: false,
        example: 'interfaceContainerBlock'
    })
    @IsOptional()
    @IsString()
    right_type?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Block_1'
    })
    @IsOptional()
    @IsString()
    right_tag?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '100%'
    })
    @IsOptional()
    @IsString()
    index_rate?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '100%'
    })
    @IsOptional()
    @IsString()
    permission_rate?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '83%'
    })
    @IsOptional()
    @IsString()
    prop_rate?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '70%'
    })
    @IsOptional()
    @IsString()
    event_rate?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '100%'
    })
    @IsOptional()
    @IsString()
    artifacts_rate?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '80%'
    })
    @IsOptional()
    @IsString()
    total_rate?: string;

    @ApiProperty({
        type: ComparePoliciesBlockSideDTO,
        required: false
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesBlockSideDTO)
    left?: ComparePoliciesBlockSideDTO;

    @ApiProperty({
        type: ComparePoliciesBlockSideDTO,
        required: false
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesBlockSideDTO)
    right?: ComparePoliciesBlockSideDTO;

    @ApiProperty({
        type: ComparePoliciesRateEntryDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesRateEntryDTO)
    properties?: ComparePoliciesRateEntryDTO[];

    @ApiProperty({
        type: ComparePoliciesRateEntryDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesRateEntryDTO)
    events?: ComparePoliciesRateEntryDTO[];

    @ApiProperty({
        type: ComparePoliciesRateEntryDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesRateEntryDTO)
    permissions?: ComparePoliciesRateEntryDTO[];

    @ApiProperty({
        type: ComparePoliciesRateEntryDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesRateEntryDTO)
    artifacts?: ComparePoliciesRateEntryDTO[];

    @ApiProperty({
        type: Number,
        required: false,
        description: 'Present in merged multi-compare report rows'
    })
    @IsOptional()
    @IsNumber()
    size?: number;

}

export class ComparePoliciesPropsReportRowDTO {
    @ApiProperty({
        type: String,
        required: false,
        example: 'Owner'
    })
    @IsOptional()
    @IsString()
    left_name?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Owner'
    })
    @IsOptional()
    @IsString()
    right_name?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: '100%'
    })
    @IsOptional()
    @IsString()
    total_rate?: string;

    @ApiProperty({
        type: Object,
        required: false
    })
    @IsOptional()
    @IsObject()
    left?: any;

    @ApiProperty({
        type: Object,
        required: false
    })
    @IsOptional()
    @IsObject()
    right?: any;

    @ApiProperty({
        type: String,
        required: false,
        example: 'FULL'
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        type: ComparePoliciesRateEntryDTO,
        isArray: true,
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesRateEntryDTO)
    properties?: ComparePoliciesRateEntryDTO[];

    @ApiProperty({
        type: Number,
        required: false,
        description: 'Present in merged multi-compare report rows'
    })
    @IsOptional()
    @IsNumber()
    size?: number;

}
/* tslint:enable:variable-name */

export class ComparePoliciesBlocksSectionDTO {
    @ApiProperty({
        type: ComparePoliciesColumnDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesColumnDTO)
    columns: ComparePoliciesColumnDTO[];

    @ApiProperty({
        type: ComparePoliciesBlocksReportRowDTO,
        isArray: true,
        description: 'Rows may include additional dynamic fields in multi-compare mode'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesBlocksReportRowDTO)
    report: ComparePoliciesBlocksReportRowDTO[];
}

export class ComparePoliciesPropsSectionDTO {
    @ApiProperty({
        type: ComparePoliciesColumnDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesColumnDTO)
    columns: ComparePoliciesColumnDTO[];

    @ApiProperty({
        type: ComparePoliciesPropsReportRowDTO,
        isArray: true,
        description: 'Rows may include additional dynamic fields in multi-compare mode'
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesPropsReportRowDTO)
    report: ComparePoliciesPropsReportRowDTO[];
}

export class ComparePoliciesDTO {
    @ApiProperty({
        type: ComparePoliciesItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesItemDTO)
    left: ComparePoliciesItemDTO;

    @ApiProperty({
        type: ComparePoliciesItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesItemDTO)
    right: ComparePoliciesItemDTO;

    @ApiProperty({
        type: Number,
        example: 66
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        type: ComparePoliciesBlocksSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesBlocksSectionDTO)
    blocks: ComparePoliciesBlocksSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    roles: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    groups: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    topics: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    tokens: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    tools: ComparePoliciesPropsSectionDTO;
}

export class ComparePoliciesMultiDTO {
    @ApiProperty({
        type: Number,
        example: 3
    })
    @IsNumber()
    size: number;

    @ApiProperty({
        type: ComparePoliciesItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesItemDTO)
    left: ComparePoliciesItemDTO;

    @ApiProperty({
        type: ComparePoliciesItemDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesItemDTO)
    rights: ComparePoliciesItemDTO[];

    @ApiProperty({
        type: Object,
        isArray: true
    })
    @IsArray()
    totals: any[];

    @ApiProperty({
        type: ComparePoliciesBlocksSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesBlocksSectionDTO)
    blocks: ComparePoliciesBlocksSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    roles: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    groups: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    topics: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    tokens: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => ComparePoliciesPropsSectionDTO)
    tools: ComparePoliciesPropsSectionDTO;
}

export class CompareModulesItemDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        example: 'Module_1'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        example: 'Some specific module for test purposes'
    })
    @IsString()
    description: string;
}

export class CompareModulesSectionDTO {
    @ApiProperty({
        type: ComparePoliciesColumnDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesColumnDTO)
    columns: ComparePoliciesColumnDTO[];

    @ApiProperty({
        type: Object,
        isArray: true
    })
    @IsArray()
    report: any[];
}

export class CompareModulesDTO {
    @ApiProperty({
        type: CompareModulesItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesItemDTO)
    left: CompareModulesItemDTO;

    @ApiProperty({
        type: CompareModulesItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesItemDTO)
    right: CompareModulesItemDTO;

    @ApiProperty({
        type: Number,
        example: 22
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        type: CompareModulesSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesSectionDTO)
    blocks: CompareModulesSectionDTO;

    @ApiProperty({
        type: CompareModulesSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesSectionDTO)
    inputEvents: CompareModulesSectionDTO;

    @ApiProperty({
        type: CompareModulesSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesSectionDTO)
    outputEvents: CompareModulesSectionDTO;

    @ApiProperty({
        type: CompareModulesSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareModulesSectionDTO)
    variables: CompareModulesSectionDTO;
}

export class CompareSchemasItemDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        example: 'Schema name'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        example: 'Schema description'
    })
    @IsString()
    description: string;

    @ApiProperty({
        type: String,
        example: Examples.UUID
    })
    @IsString()
    uuid: string;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: '0.0.8264622'
    })
    @IsOptional()
    @IsString()
    topicId?: string | null;

    @ApiProperty({
        type: String,
        example: '1'
    })
    @IsString()
    version: string;

    @ApiProperty({
        type: String,
        example: 'schema:iri'
    })
    @IsString()
    iri: string;

    @ApiProperty({
        type: Object,
        required: false
    })
    @IsOptional()
    @IsObject()
    policy?: any;
}

export class CompareSchemasSectionDTO {
    @ApiProperty({
        type: ComparePoliciesColumnDTO,
        isArray: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ComparePoliciesColumnDTO)
    columns: ComparePoliciesColumnDTO[];

    @ApiProperty({
        type: Object,
        isArray: true
    })
    @IsArray()
    report: any[];
}

export class CompareSchemasDTO {
    @ApiProperty({
        type: CompareSchemasItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareSchemasItemDTO)
    left: CompareSchemasItemDTO;

    @ApiProperty({
        type: CompareSchemasItemDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareSchemasItemDTO)
    right: CompareSchemasItemDTO;

    @ApiProperty({
        type: Number,
        example: 44
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        type: CompareSchemasSectionDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => CompareSchemasSectionDTO)
    fields: CompareSchemasSectionDTO;
}

export class CompareDocumentItemDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        example: 'VerifiableCredential'
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: String,
        example: Examples.DID
    })
    @IsString()
    owner: string;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: 'Policy A'
    })
    @IsOptional()
    @IsString()
    policy?: string | null;
}

export class CompareDocumentsSectionDTO {
    @ApiProperty({
        type: ComparePoliciesColumnDTO,
        isArray: true
    })
    @IsArray()
    @Type(() => ComparePoliciesColumnDTO)
    columns: ComparePoliciesColumnDTO[];

    @ApiProperty({
        type: Object,
        isArray: true
    })
    @IsArray()
    report: any[];
}

export class CompareDocumentsDTO {
    @ApiProperty({
        type: CompareDocumentItemDTO
    })
    @IsObject()
    @Type(() => CompareDocumentItemDTO)
    left: CompareDocumentItemDTO;

    @ApiProperty({
        type: CompareDocumentItemDTO
    })
    @IsObject()
    @Type(() => CompareDocumentItemDTO)
    right: CompareDocumentItemDTO;

    @ApiProperty({
        type: Number,
        example: 68
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        type: CompareDocumentsSectionDTO
    })
    @IsObject()
    @Type(() => CompareDocumentsSectionDTO)
    documents: CompareDocumentsSectionDTO;
}

export class CompareDocumentsMultiDTO {
    @ApiProperty({
        type: Number,
        example: 3
    })
    @IsNumber()
    size: number;

    @ApiProperty({
        type: CompareDocumentItemDTO
    })
    @IsObject()
    @Type(() => CompareDocumentItemDTO)
    left: CompareDocumentItemDTO;

    @ApiProperty({
        type: CompareDocumentItemDTO,
        isArray: true
    })
    @IsArray()
    @Type(() => CompareDocumentItemDTO)
    rights: CompareDocumentItemDTO[];

    @ApiProperty({
        type: Number,
        isArray: true
    })
    @IsArray()
    totals: number[];

    @ApiProperty({
        type: CompareDocumentsSectionDTO
    })
    @IsObject()
    @Type(() => CompareDocumentsSectionDTO)
    documents: CompareDocumentsSectionDTO;
}

export class CompareDocumentsV2DTO {
    @ApiProperty()
    @IsObject()
    projects: CompareDocumentsDTO;

    @ApiProperty()
    @IsObject()
    presentations: CompareDocumentsDTO;
}

export class CompareToolItemDTO {
    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        example: 'Tool 30'
    })
    @IsString()
    name: string;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: 'Description'
    })
    @IsOptional()
    @IsString()
    description?: string | null;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: '4r7i6SXuDxDrk8dkwomzgkfFp8FqMuWSCsuWqZhhYLZ4'
    })
    @IsOptional()
    @IsString()
    hash?: string | null;

    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        example: Examples.MESSAGE_ID
    })
    @IsOptional()
    @IsString()
    messageId?: string | null;
}

export class CompareToolsDTO {
    @ApiProperty({
        type: CompareToolItemDTO
    })
    @IsObject()
    @Type(() => CompareToolItemDTO)
    left: CompareToolItemDTO;

    @ApiProperty({
        type: CompareToolItemDTO
    })
    @IsObject()
    @Type(() => CompareToolItemDTO)
    right: CompareToolItemDTO;

    @ApiProperty({
        type: Number,
        example: 74
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        type: ComparePoliciesBlocksSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesBlocksSectionDTO)
    blocks: ComparePoliciesBlocksSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    inputEvents: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    outputEvents: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    variables: ComparePoliciesPropsSectionDTO;
}

export class CompareToolsMultiDTO {
    @ApiProperty({
        type: Number,
        example: 3
    })
    @IsNumber()
    size: number;

    @ApiProperty({
        type: CompareToolItemDTO
    })
    @IsObject()
    @Type(() => CompareToolItemDTO)
    left: CompareToolItemDTO;

    @ApiProperty({
        type: CompareToolItemDTO,
        isArray: true
    })
    @IsArray()
    @Type(() => CompareToolItemDTO)
    rights: CompareToolItemDTO[];

    @ApiProperty({
        type: Number,
        isArray: true
    })
    @IsArray()
    totals: number[];

    @ApiProperty({
        type: ComparePoliciesBlocksSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesBlocksSectionDTO)
    blocks: ComparePoliciesBlocksSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    inputEvents: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    outputEvents: ComparePoliciesPropsSectionDTO;

    @ApiProperty({
        type: ComparePoliciesPropsSectionDTO
    })
    @IsObject()
    @Type(() => ComparePoliciesPropsSectionDTO)
    variables: ComparePoliciesPropsSectionDTO;
}