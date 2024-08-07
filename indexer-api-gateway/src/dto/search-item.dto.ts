import { SearchItem } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class SearchItemDTO implements SearchItem {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    consensusTimestamp: string;

    @ApiProperty({
        description: 'Message type',
        example: 'VC-Document',
    })
    type: string;
}
