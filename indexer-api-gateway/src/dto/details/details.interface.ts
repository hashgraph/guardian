import {
    Details,
    DetailsActivity,
    DetailsHistory,
    DetailsHistoryActivity,
} from '@indexer/interfaces';
import { MessageDTO } from '../message.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { RawMessageDTO } from '../raw-message.dto.js';
import { TokenDTO } from './token.details.js';
import { NFTDTO } from './nft.details.js';

export class DetailsDTO<
    T extends MessageDTO | TokenDTO | NFTDTO,
    RT = RawMessageDTO
> implements Details<T, RT>
{
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid?: string;
    item?: T;
    row?: RT;
}

export class DetailsHistoryDTO<T extends MessageDTO, RT = RawMessageDTO>
    extends DetailsDTO<T, RT>
    implements DetailsHistory<T, RT>
{
    history?: T[];
}

export class DetailsActivityDTO<T extends MessageDTO, AT, RT = RawMessageDTO>
    extends DetailsDTO<T, RT>
    implements DetailsActivity<T, AT, RT>
{
    activity?: AT;
}

export class DetailsHistoryActivityDTO<
        T extends MessageDTO,
        AT,
        RT = RawMessageDTO
    >
    extends DetailsDTO<T, RT>
    implements DetailsHistoryActivity<T, AT, RT>
{
    history?: T[];
    activity?: AT;
}
