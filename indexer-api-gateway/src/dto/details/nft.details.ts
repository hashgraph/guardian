import { NFT, NFTDetails } from '@indexer/interfaces';
import { DetailsDTO } from './details.interface.js';
import { RawNFTDTO } from '../raw-nft.dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { VPDetailsItemDTO } from './vp.details.js';

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
        type: 'array',
        items: {
            type: 'object',
        },
        example: [
            {
                consensus_timestamp: '1707292471.903596642',
                nonce: 0,
                transaction_id: '0.0.1533323-1707292459-175375906',
                type: 'CRYPTOTRANSFER',
                is_approval: false,
                receiver_account_id: '0.0.1842221',
                sender_account_id: '0.0.1533323',
            },
            {
                consensus_timestamp: '1707292470.199625477',
                nonce: 0,
                transaction_id: '0.0.1533323-1707292458-093221893',
                type: 'TOKENMINT',
                is_approval: false,
                receiver_account_id: '0.0.1533323',
                sender_account_id: null,
            },
        ],
    })
    history: any[];

    @ApiProperty({
        type: [VPDetailsItemDTO],
    })
    declare labels?: VPDetailsItemDTO[];
}
