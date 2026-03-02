import {
    TokenMintResult,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class TokenMintResultDTO implements TokenMintResult {
    @ApiProperty({
        description: 'Consensus timestamp (unique message identifier)',
        example: '1706823227.586179534',
    })
    consensusTimestamp: string;

    @ApiProperty({
        description: 'Topic identifier',
        example: '0.0.1960',
    })
    topicId: string;

    @ApiProperty({
        description: 'Token identifier',
        example: '0.0.1621155',
    })
    tokenId: string;

    @ApiProperty({
        description: 'Token name',
        example: 'Carbon Credit Token',
    })
    tokenName?: string;

    @ApiProperty({
        description: 'Token symbol',
        example: 'CCT',
    })
    tokenSymbol?: string;

    @ApiProperty({
        description: 'Minted token amount',
        example: '5000',
    })
    tokenAmount: string;

    @ApiProperty({
        description: 'Parsed numeric amount for sorting',
        example: 5000,
    })
    tokenAmountNumeric?: number;

    @ApiProperty({
        description: 'Policy message identifier (methodology)',
        example: '1706823227.586179534',
    })
    policyId?: string;

    @ApiProperty({
        description: 'Policy description / name',
        example: 'iREC Policy',
    })
    policyDescription?: string;

    @ApiProperty({
        description: 'Schema names (standard type)',
        example: ['MintToken', 'Monitoring Report'],
    })
    schemaNames?: string[];

    @ApiProperty({
        description: 'Issuer DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    issuer?: string;

    @ApiProperty({
        description: 'Owner',
        example: '0.0.1234',
    })
    owner?: string;

    @ApiProperty({
        description: 'Mint date (derived from consensus timestamp)',
        example: '2024-02-06T05:40:45.000Z',
    })
    mintDate?: string;

    @ApiProperty({
        description: 'Geography (if available)',
        example: 'United States',
    })
    geography?: string;
}

export class TokenMintPageDTO {
    @ApiProperty({
        description: 'Items on the current page',
        type: [TokenMintResultDTO],
    })
    items: TokenMintResultDTO[];

    @ApiProperty({
        description: 'Page index (zero-based)',
        example: 0,
    })
    pageIndex: number;

    @ApiProperty({
        description: 'Items per page',
        example: 20,
    })
    pageSize: number;

    @ApiProperty({
        description: 'Total number of matching token mint events',
        example: 150,
    })
    total: number;

    @ApiProperty({
        description: 'Sum of all matching token amounts across the entire result set (not just the current page)',
        example: 500000,
    })
    totalAmount: number;
}
