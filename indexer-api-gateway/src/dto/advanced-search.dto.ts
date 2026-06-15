import {
    AdvancedSearchParams,
    AdvancedSearchResult,
    AdvancedSearchResultItem,
    AdvancedSearchStep,
    AdvancedSearchDisplayColumn,
    AdvancedSearchSort,
    AdvancedSearchGroupBy,
    SearchCondition,
    ConditionOperator,
} from '@indexer/interfaces';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    IsIn,
    ValidateNested,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

const OPERATORS: ConditionOperator[] = [
    'eq', 'neq', 'contains', 'regex', 'gt', 'gte', 'lt', 'lte',
    'between', 'in', 'not_in',
];

export class SearchConditionDTO implements SearchCondition {
    @ApiProperty({ description: 'Field path (dot notation)', example: 'analytics.policyId' })
    @IsString()
    field: string;

    @ApiProperty({ description: 'Operator', enum: OPERATORS })
    @IsIn(OPERATORS)
    operator: ConditionOperator;

    @ApiProperty({ description: 'Comparison value' })
    value: string | number | boolean | string[];

    @ApiPropertyOptional({ description: 'Upper bound for "between" operator' })
    @IsOptional()
    valueTo?: string | number;
}

export class AdvancedSearchStepDTO implements AdvancedSearchStep {
    @ApiPropertyOptional({ description: 'Step label', example: 'Step 1: Monitoring Reports' })
    @IsString()
    @IsOptional()
    label?: string;

    @ApiPropertyOptional({ description: 'Document type to restrict this step', example: 'VC-Document' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Multiple document types (OR)', type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    types?: string[];

    @ApiProperty({ description: 'AND-combined field conditions', type: [SearchConditionDTO] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SearchConditionDTO)
    conditions: SearchConditionDTO[];

    @ApiPropertyOptional({ description: 'Fields to carry forward to the next step', type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    carryFields?: string[];
}

export class AdvancedSearchDisplayColumnDTO implements AdvancedSearchDisplayColumn {
    @ApiProperty({ description: 'Field path', example: 'analytics.policyId' })
    @IsString()
    field: string;

    @ApiProperty({ description: 'Column header', example: 'Policy ID' })
    @IsString()
    header: string;
}

export class AdvancedSearchSortDTO implements AdvancedSearchSort {
    @ApiProperty({ description: 'Sort field', example: 'consensusTimestamp' })
    @IsString()
    field: string;

    @ApiProperty({ description: 'Sort direction', enum: ['asc', 'desc'] })
    @IsIn(['asc', 'desc'])
    order: 'asc' | 'desc';
}

export class AdvancedSearchGroupByDTO implements AdvancedSearchGroupBy {
    @ApiProperty({ description: 'Group-by field', example: 'analytics.policyId' })
    @IsString()
    field: string;

    @ApiPropertyOptional({ description: 'Optional numeric/date ranges', type: 'array', items: { type: 'object' } })
    @IsArray()
    @IsOptional()
    ranges?: any[];
}

export class AdvancedSearchParamsDTO implements AdvancedSearchParams {
    @ApiProperty({ description: 'Ordered search steps', type: [AdvancedSearchStepDTO] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AdvancedSearchStepDTO)
    steps: AdvancedSearchStepDTO[];

    @ApiPropertyOptional({ description: 'Result grid columns', type: [AdvancedSearchDisplayColumnDTO] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AdvancedSearchDisplayColumnDTO)
    @IsOptional()
    displayColumns?: AdvancedSearchDisplayColumnDTO[];

    @ApiPropertyOptional({ description: 'Sort configuration', type: [AdvancedSearchSortDTO] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AdvancedSearchSortDTO)
    @IsOptional()
    sort?: AdvancedSearchSortDTO[];

    @ApiPropertyOptional({ description: 'Group-by configuration', type: AdvancedSearchGroupByDTO })
    @ValidateNested()
    @Type(() => AdvancedSearchGroupByDTO)
    @IsOptional()
    groupBy?: AdvancedSearchGroupByDTO;

    @ApiProperty({ description: 'Page index', example: 0 })
    @IsNumber()
    pageIndex: number;

    @ApiProperty({ description: 'Page size (max 100)', example: 10 })
    @IsNumber()
    pageSize: number;
}

export class AdvancedSearchResultItemDTO implements AdvancedSearchResultItem {
    @ApiProperty({ description: 'Consensus timestamp', example: '1706823227.586179534' })
    consensusTimestamp: string;

    @ApiProperty({ description: 'Document type', example: 'VC-Document' })
    type: string;

    @ApiPropertyOptional({ description: 'Topic ID' })
    topicId?: string;

    @ApiPropertyOptional({ description: 'Owner DID' })
    owner?: string;

    [key: string]: any;
}

export class AdvancedSearchResultDTO implements AdvancedSearchResult {
    @ApiProperty({ description: 'Result rows', type: [AdvancedSearchResultItemDTO] })
    items: AdvancedSearchResultItemDTO[];

    @ApiProperty({ description: 'Total matching documents', example: 42 })
    total: number;

    @ApiProperty({ description: 'Current page index', example: 0 })
    pageIndex: number;

    @ApiProperty({ description: 'Page size', example: 10 })
    pageSize: number;

    @ApiProperty({ description: 'Column metadata for the grid', type: 'array', items: { type: 'object' } })
    columns: Array<{ field: string; header: string }>;

    @ApiPropertyOptional({ description: 'Base64-encoded search token for bookmarking' })
    searchToken?: string;
}
