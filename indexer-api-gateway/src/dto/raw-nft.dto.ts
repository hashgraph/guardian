import { RawNFT } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class RawNFTDTO implements RawNFT {
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
        description: 'metadata',
        example: '1706823227.586179534',
    })
    metadata: string;
}
