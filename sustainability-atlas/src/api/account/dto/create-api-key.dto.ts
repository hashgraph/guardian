import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body for creating a new API key. Only a human-readable name is accepted. */
export class CreateApiKeyDto {
    @ApiProperty({ description: 'Recognisable name, e.g. "dev" or "prod-pipeline"', maxLength: 120 })
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name: string;
}
