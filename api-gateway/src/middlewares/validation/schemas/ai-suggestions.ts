import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class PropertySuggestionRequestDTO {
    @ApiProperty({ description: 'Id of the schema the field(s) needing a suggestion belong to' })
    @IsString()
    @IsNotEmpty()
    schemaId: string;

    @ApiProperty({
        description: 'Names of the schema fields to return suggestions for',
        type: [String]
    })
    @IsArray()
    @IsString({ each: true })
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
