import { NFT, NFTDetails } from '@indexer/interfaces';
import { ApiDetailsResponseWithDefinition, DetailsDTO } from './details.interface.js';
import { RawNFTDTO } from '../raw-nft.dto.js';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export class NFTDTO extends RawNFTDTO implements NFT {}

export class NFTDetailsDTO
    extends DetailsDTO<NFTDTO, NFTDTO>
    implements NFTDetails
{
    @ApiProperty({
        description: 'NFT transaction history',
    }) // TODO Describe example
    history: any[];
}
