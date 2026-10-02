import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested
} from 'class-validator';

export class PropertySuggestionFieldInputDTO {
    @ApiProperty({ description: 'Field name' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    name: string;

    @ApiPropertyOptional({ description: 'Field title' })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    title?: string;

    @ApiPropertyOptional({ description: 'Field description' })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    description?: string;

    @ApiPropertyOptional({ description: 'Field type' })
    @IsOptional()
    @IsString()
    @MaxLength(256)
    type?: string;

    @ApiPropertyOptional({ description: 'IWA property currently assigned to the field, if any' })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    currentProperty?: string;
}

export class PropertySuggestionSchemaInputDTO {
    @ApiPropertyOptional({ description: 'Schema name' })
    @IsOptional()
    @IsString()
    @MaxLength(512)
    name?: string;

    @ApiPropertyOptional({ description: 'Schema description' })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    description?: string;

    @ApiPropertyOptional({
        description: 'IWA dMRV specification version. Defaults to \'1.0.0\' when omitted.',
        enum: ['1.0.0', '3.0.0']
    })
    @IsOptional()
    @IsIn(['1.0.0', '3.0.0'])
    iwaVersion?: string;

    @ApiProperty({
        description: 'All fields currently in the editor, used as context for the suggestions',
        type: () => PropertySuggestionFieldInputDTO,
        isArray: true
    })
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => PropertySuggestionFieldInputDTO)
    fields: PropertySuggestionFieldInputDTO[];
}

export class PropertySuggestionRequestDTO {
    @ApiPropertyOptional({ description: 'Id of the schema the field(s) needing a suggestion belong to, used for logging only' })
    @IsOptional()
    @IsString()
    schemaId?: string;

    @ApiProperty({
        description: 'Live editor state of the schema (name, description, IWA version and fields) used as the context for the suggestions',
        type: () => PropertySuggestionSchemaInputDTO
    })
    @IsObject()
    @ValidateNested()
    @Type(() => PropertySuggestionSchemaInputDTO)
    schema: PropertySuggestionSchemaInputDTO;

    @ApiProperty({
        description: 'Names of the schema fields to return suggestions for',
        type: [String]
    })
    @IsArray()
    @ArrayMaxSize(500)
    @IsString({ each: true })
    @MaxLength(256, { each: true })
    fieldNames: string[];
}

export class PropertySuggestionCandidateDTO {
    @ApiProperty()
    title: string;

    @ApiProperty()
    confidence: number;

    @ApiProperty()
    rationale: string;

    @ApiPropertyOptional({
        description: 'What this property means, sourced from the IWA dMRV v3 specification. Omitted for IWA v1 properties.'
    })
    description?: string;
}

export class PropertySuggestionResultDTO {
    @ApiProperty()
    fieldName: string;

    @ApiProperty({ type: () => PropertySuggestionCandidateDTO, isArray: true })
    candidates: PropertySuggestionCandidateDTO[];
}

export class PropertySuggestionResponseDTO {
    @ApiProperty()
    available: boolean;

    @ApiProperty({ type: () => PropertySuggestionResultDTO, isArray: true })
    results: PropertySuggestionResultDTO[];
}
