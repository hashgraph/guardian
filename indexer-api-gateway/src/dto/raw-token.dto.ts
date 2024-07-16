import { RawToken } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Token
 */
export class RawTokenDTO implements RawToken {
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    _id: string;
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    id: string;
    @ApiProperty({
        description: 'Token identifier',
        example: '0.0.4481265',
    })
    tokenId: string;
    @ApiProperty({
        description: 'Status',
        example: 'UPDATED',
    })
    status: string;
    @ApiProperty({
        description: 'Last update',
        example: 1716755852055,
    })
    lastUpdate: number;
    @ApiProperty({
        description: 'Serial number',
        example: 1,
    })
    serialNumber: number;
    @ApiProperty({
        description: 'Has next',
        example: false,
    })
    hasNext: boolean;
    @ApiProperty({
        description: 'Name',
        example: 'iRec Token',
    })
    name: string;
    @ApiProperty({
        description: 'Symbol',
        example: 'iRec',
    })
    symbol: string;
    @ApiProperty({
        description: 'Symbol',
        enum: ['NON_FUNGIBLE_UNIQUE', 'FUNGIBLE_COMMON'],
    })
    type: string;
    @ApiProperty({
        description: 'Treasury',
        example: '0.0.1',
    })
    treasury: string;
    @ApiProperty({
        description: 'Memo',
        example: '0.0.2952745',
    })
    memo: string;
    @ApiProperty({
        description: 'Total supply',
        example: '77',
    })
    totalSupply: any;
    @ApiProperty({
        description: 'Decimals',
        example: '2',
    })
    decimals?: string;
}
