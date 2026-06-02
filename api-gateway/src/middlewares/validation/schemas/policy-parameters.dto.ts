import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';

export class PolicyParametersDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.UUID
    })
    @IsString()
    policyId: string;

    @ApiProperty({
        type: () => PolicyEditableFieldDTO,
        required: false,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PolicyEditableFieldDTO)
    config: PolicyEditableFieldDTO[];

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    updated?: boolean;
}
