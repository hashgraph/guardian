import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class ThemeRoleDTO {
    @ApiProperty({
        type: 'string',
        example: 'Description'
    })
    description?: string;

    @ApiProperty({
        type: 'string',
        description: 'Text color',
        pattern: '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
        required: true,
        example: Examples.COLOR
    })
    text: string;

    @ApiProperty({
        type: 'string',
        description: 'Background color',
        pattern: '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
        required: true,
        example: Examples.COLOR
    })
    background: string;

    @ApiProperty({
        type: 'string',
        description: 'Border color',
        pattern: '(^#[0-9a-f]{3}$)|(^#[0-9a-f]{6}$)|(^#[0-9a-f]{8}$)',
        required: true,
        example: Examples.COLOR
    })
    border: string;

    @ApiProperty({
        type: 'string',
        description: 'Object shape',
        enum: ['0', '1', '2', '3', '4', '5'],
        required: true,
        example: '0'
    })
    shape: string;

    @ApiProperty({
        type: 'string',
        description: 'Border width',
        enum: ['0px', '1px', '2px', '3px', '4px', '5px', '6px', '7px'],
        required: true,
        example: '2px'
    })
    borderWidth: string;

    @ApiProperty({
        type: 'string',
        description: 'Filter by type',
        enum: ['type', 'api', 'role'],
        required: true,
        example: 'type'
    })
    filterType: string;

    @ApiProperty({
        required: true,
        oneOf: [
            {
                type: 'string',
            },
            {
                type: 'array',
                items: {
                    type: 'string',
                }
            },
        ],
    })
    filterValue: string | string[]
}

@ApiExtraModels(ThemeRoleDTO)
export class ThemeDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: 'string',
        required: true,
        example: 'Theme name'
    })
    name: string;

    @ApiProperty({
        type: () => ThemeRoleDTO,
        required: true,
        isArray: true,
    })
    rules: ThemeRoleDTO[];
}