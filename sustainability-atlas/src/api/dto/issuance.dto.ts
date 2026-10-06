import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from './pagination.dto';

/**
 * Response shapes for the issuance detail page.
 *
 * Deliberately split: the summary is small and paints the page, while token
 * context, serial ranges, transactions and related issuances each load on their
 * own. Bundling them was what made the old token-keyed page slow.
 */

export class IssuanceSummaryDto {
    @ApiProperty({ description: 'HCS consensus timestamp of the MintToken credential, used as the issuance identifier' })
    mintConsensusTimestamp: string;

    @ApiProperty({ nullable: true, description: "Mint VP-Document timestamp; the value Guardian stamps into NFT metadata or the fungible mint transaction's memo" })
    vpConsensusTimestamp: string | null;

    @ApiProperty({ nullable: true, description: 'Amount the MintToken credential declared (a statement of intent)' })
    declaredAmount: number | null;

    @ApiProperty({ nullable: true, description: 'Amount the ledger actually minted. Null until reconciled.' })
    mintedAmount: number | null;

    @ApiProperty({
        nullable: true,
        description:
            'verified | mismatch | unmatched | ambiguous | null: how the on-chain mint reconciles ' +
            'against the credential. See IssuanceEventDto.mintMatchStatus.',
    })
    mintMatchStatus: string | null;

    @ApiProperty({ nullable: true, description: 'Mint date from the credential' })
    mintDate: string | null;

    @ApiProperty({ nullable: true, description: 'Serials attributed to this issuance. Null for fungible tokens.' })
    serialCount: number | null;

    @ApiProperty({ nullable: true, description: 'Of those, how many are retired' })
    serialRetiredCount: number | null;

    @ApiProperty({ nullable: true, description: "Of those, how many are held outside the token's treasury. Null when it cannot be determined." })
    serialTransferredCount: number | null;

    @ApiProperty({ nullable: true }) tokenId: string | null;
    @ApiProperty({ nullable: true }) tokenName: string | null;
    @ApiProperty({ nullable: true }) tokenSymbol: string | null;
    @ApiProperty({ nullable: true, description: 'FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE' }) tokenType: string | null;

    @ApiProperty({ nullable: true, description: 'Project this issuance was minted for' }) projectId: string | null;
    @ApiProperty({ nullable: true }) projectName: string | null;
    @ApiProperty({ nullable: true, description: "Topic id of the issuance's methodology" }) methodologyId: string | null;
    @ApiProperty({ nullable: true }) methodologyName: string | null;
    @ApiProperty({ nullable: true }) registryDid: string | null;
    @ApiProperty({ nullable: true }) registryName: string | null;
}

export class RelatedProjectDto {
    @ApiProperty() projectId: string;
    @ApiProperty({ nullable: true }) projectName: string | null;
}

export class IssuanceTokenInfoDto {
    @ApiProperty({ nullable: true }) tokenId: string | null;

    @ApiProperty({ nullable: true, description: 'Current supply, scaled by token decimals. Net of retirements, not the amount minted.' })
    tokenSupply: number | null;

    @ApiProperty({ nullable: true }) decimals: number | null;
    @ApiProperty({ nullable: true, description: 'Treasury account; credits held elsewhere have been transferred out' }) treasury: string | null;

    @ApiProperty({ description: 'Credits minted from this token across every project that uses it' })
    totalMintedAllProjects: number;

    @ApiProperty({ description: "Credits minted from this token for this issuance's project" })
    totalMintedThisProject: number;

    @ApiProperty({ description: 'Issuances recorded against this token' })
    issuanceCount: number;

    @ApiProperty({ nullable: true, description: 'When the token was created on Hedera' }) tokenCreatedDate: string | null;
    @ApiProperty({ nullable: true }) policyTopicId: string | null;
    @ApiProperty({ nullable: true }) policyName: string | null;
    @ApiProperty({ nullable: true, description: 'DID that published the token-creation message' }) issuerDid: string | null;

    @ApiProperty({ type: [RelatedProjectDto], description: 'Every project minting from this token' })
    relatedProjects: RelatedProjectDto[];
}

export class RelatedIssuanceDto {
    @ApiProperty() mintConsensusTimestamp: string;
    @ApiProperty({ nullable: true }) declaredAmount: number | null;
    @ApiProperty({ nullable: true }) mintedAmount: number | null;
    @ApiProperty({ nullable: true }) mintMatchStatus: string | null;
    @ApiProperty({ nullable: true }) mintDate: string | null;
    @ApiProperty({ nullable: true }) projectId: string | null;
    @ApiProperty({ nullable: true }) projectName: string | null;
}

export class PaginatedRelatedIssuancesDto {
    @ApiProperty({ type: [RelatedIssuanceDto], description: 'Other issuances of the same token, newest first' })
    data: RelatedIssuanceDto[];

    @ApiProperty({ type: PaginationMeta })
    meta: PaginationMeta;
}
