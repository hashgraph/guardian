import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';
import { IsOptional, IsString } from 'class-validator';
import { PolicyEditableFieldDTO } from '@guardian/interfaces';

export class PolicyParametersDTO {
    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.DB_ID
    })
    userId: string;

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
    @IsString()
    config: PolicyEditableFieldDTO[];

    @ApiProperty({
        type: 'boolean',
        required: false,
        example: true
    })
    @IsString()
    @IsOptional()
    updated: boolean;

    @ApiProperty({
        type: 'string',
        required: false,
        example: 'Prop Value'
    })
    @IsString()
    @IsOptional()
    propValue?: string;
}
