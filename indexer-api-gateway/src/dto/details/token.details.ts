import { Token, TokenDetails } from '@indexer/interfaces';
import { DetailsDTO } from './details.interface.js';
import { RawTokenDTO } from '../raw-token.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { VPDetailsItemDTO } from './vp.details.js';

export class TokenDTO extends RawTokenDTO implements Token {}

export class TokenDetailsDTO
    extends DetailsDTO<TokenDTO, TokenDTO>
    implements TokenDetails
{
    @ApiProperty({
        type: TokenDTO,
    })
    declare row?: TokenDTO;

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare labels?: VPDetailsItemDTO[];
}
