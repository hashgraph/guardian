import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class VpDTO {
    @ApiProperty({
        type: 'string',
        isArray: true
    })
    '@context': string[];

    @ApiProperty({
        type: 'string',
        example: Examples.UUID
    })
    id: string;

    @ApiProperty({
        type: 'string',
        isArray: true
    })
    type: string[];

    @ApiProperty({
        type: 'object',
        isArray: true
    })
    verifiableCredential: any[];

    @ApiProperty({
        type: 'object',
    })
    proof?: any;
}

@ApiExtraModels(VpDTO)
export class VpDocumentDTO {
    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    id?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DB_ID
    })
    policyId?: string;

    @ApiProperty({
        type: 'string',
        example: 'hash'
    })
    hash?: string;

    @ApiProperty({
        type: 'number',
        example: 0
    })
    signature?: number;

    @ApiProperty({
        type: 'string',
        enum: [
            'NEW',
            'ISSUE',
            'REVOKE',
            'SUSPEND',
            'RESUME',
            'FAILED'
        ],
        example: 'NEW'
    })
    status?: string;

    @ApiProperty({
        type: 'string',
        example: 'Block tag'
    })
    tag?: string;

    @ApiProperty({
        type: 'string',
        example: 'Document type'
    })
    type?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    createDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DATE
    })
    updateDate?: string;

    @ApiProperty({
        type: 'string',
        example: Examples.DID
    })
    owner?: string;

    @ApiProperty({
        type: () => VpDTO,
    })
    document?: VpDTO[];
}