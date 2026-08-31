import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PropertySuggestionFieldDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    currentProperty?: string;
}

export class PropertySuggestionRequestDTO {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    schemaTitle?: string;

    @ApiProperty({
        description: 'IWA dMRV specification version this property belongs to',
        example: '3.0.0',
        required: false
    })
    @IsString()
    @IsOptional()
    iwaVersion?: string;

    @ApiProperty({ type: () => PropertySuggestionFieldDTO, isArray: true })
    @IsArray()
    @Type(() => PropertySuggestionFieldDTO)
    fields: PropertySuggestionFieldDTO[];
}

export class PropertySuggestionCandidateDTO {
    @ApiProperty()
    title: string;

    @ApiProperty()
    confidence: number;

    @ApiProperty()
    rationale: string;
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
