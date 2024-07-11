import { NFT, NFTDetails } from '@indexer/interfaces';
import { DetailsDTO } from './details.interface.js';
import { RawNFTDTO } from '../raw-nft.dto.js';
import { ApiProperty } from '@nestjs/swagger';

export class NFTDTO extends RawNFTDTO implements NFT {}

export class NFTDetailsDTO
    extends DetailsDTO<NFTDTO, NFTDTO>
    implements NFTDetails
{
    @ApiProperty({
        type: NFTDTO,
    })
    declare row?: NFTDTO;
    @ApiProperty({
        description: 'NFT transaction history',
    }) // TODO Describe example
    history: any[];
}
