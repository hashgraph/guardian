import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IssuanceService } from '../services/issuance.service';
import {
    IssuanceSummaryDto,
    IssuanceTokenInfoDto,
    PaginatedRelatedIssuancesDto,
} from '../dto/issuance.dto';
import { MintSerialsResponseDto, MintTransactionsResponseDto } from '../dto/project.dto';
import { PaginationQueryDto } from '../dto/pagination.dto';

/**
 * One issuance — a single MintToken credential — addressed by its own
 * identifier rather than by token id.
 *
 * A token routinely carries several mint events, so a token-keyed URL cannot
 * name an issuance. Each section of the detail page has its own route so the
 * page paints from the small summary and loads the heavier parts separately.
 */
@ApiTags('Credit issuances')
@Controller('api/v1/:network/issuances')
export class IssuanceController {
    constructor(private readonly issuanceService: IssuanceService) {}

    @Get(':mintTimestamp')
    @ApiOperation({
        summary: 'Get a credit issuance summary',
        description:
            'Headline facts about a single mint event: the amount its Guardian credential declared, ' +
            'the amount actually minted on-chain, how the two reconcile, and the project, methodology ' +
            'and registry it belongs to. Small by design: the serials, transactions, token context ' +
            'and related issuances each have their own paginated route.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'], description: 'Hedera network' })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken credential' })
    @ApiResponse({ status: 200, type: IssuanceSummaryDto })
    @ApiResponse({ status: 404, description: 'Issuance not found' })
    async getSummary(
        @Param('network') network: string,
        @Param('mintTimestamp') mintTimestamp: string,
    ): Promise<IssuanceSummaryDto> {
        return this.issuanceService.findSummary(network, mintTimestamp);
    }

    @Get(':mintTimestamp/serials')
    @ApiOperation({
        summary: 'List the credit serial numbers from an issuance',
        description:
            'Serials produced by the issuance, returned as contiguous ranges rather than one entry ' +
            'each. Lossless (every serial\'s status is implied by its range), and a large issuance ' +
            'collapses to a handful of rows. Fungible issuances return no ranges: their units are ' +
            'interchangeable and cannot be enumerated. Pagination counts ranges, not serials.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken credential' })
    @ApiResponse({ status: 200, type: MintSerialsResponseDto })
    @ApiResponse({ status: 404, description: 'Issuance not found' })
    async getSerials(
        @Param('network') network: string,
        @Param('mintTimestamp') mintTimestamp: string,
        @Query() query: PaginationQueryDto,
    ): Promise<MintSerialsResponseDto> {
        return this.issuanceService.findSerials(network, mintTimestamp, query.page ?? 1, query.limit ?? 20);
    }

    @Get(':mintTimestamp/transactions')
    @ApiOperation({
        summary: 'See retirements and transfers for an issuance',
        description:
            'On-chain transactions affecting this issuance\'s credits, newest first. Retirements come ' +
            'from Guardian\'s retirement contract and name the retiring account and exact serials; ' +
            'transfers come from the Hedera CRYPTOTRANSFER itself, since Guardian writes no transfer ' +
            'document. One row per transaction, since a retirement or distribution usually moves many ' +
            'serials at once. Transfer coverage is the treasury hop; onward trades are not indexed.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken credential' })
    @ApiResponse({ status: 200, type: MintTransactionsResponseDto })
    @ApiResponse({ status: 404, description: 'Issuance not found' })
    async getTransactions(
        @Param('network') network: string,
        @Param('mintTimestamp') mintTimestamp: string,
        @Query() query: PaginationQueryDto,
    ): Promise<MintTransactionsResponseDto> {
        return this.issuanceService.findTransactions(
            network, mintTimestamp, query.page ?? 1, query.limit ?? 20, query.sortBy, query.sortDir,
        );
    }

    @Get(':mintTimestamp/token')
    @ApiOperation({
        summary: 'Get details of the token behind an issuance',
        description:
            'The token this issuance minted from: current supply, credits minted across every project ' +
            'sharing the token and for this issuance\'s project alone, the projects involved, and the ' +
            'provenance fields (policy topic, token creation date, issuer DID).',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken credential' })
    @ApiResponse({ status: 200, type: IssuanceTokenInfoDto })
    @ApiResponse({ status: 404, description: 'Issuance not found' })
    async getTokenInfo(
        @Param('network') network: string,
        @Param('mintTimestamp') mintTimestamp: string,
    ): Promise<IssuanceTokenInfoDto> {
        return this.issuanceService.findTokenInfo(network, mintTimestamp);
    }

    @Get(':mintTimestamp/related-issuances')
    @ApiOperation({
        summary: 'See other issuances of the same token',
        description:
            'Every other mint event recorded against this issuance\'s token, newest first, with each ' +
            'one\'s declared and actually-minted amounts and the project it belongs to.',
    })
    @ApiParam({ name: 'network', enum: ['mainnet', 'testnet', 'previewnet'] })
    @ApiParam({ name: 'mintTimestamp', description: 'HCS consensus timestamp of the MintToken credential' })
    @ApiResponse({ status: 200, type: PaginatedRelatedIssuancesDto })
    @ApiResponse({ status: 404, description: 'Issuance not found' })
    async getRelatedIssuances(
        @Param('network') network: string,
        @Param('mintTimestamp') mintTimestamp: string,
        @Query() query: PaginationQueryDto,
    ): Promise<PaginatedRelatedIssuancesDto> {
        return this.issuanceService.findRelatedIssuances(network, mintTimestamp, query.page ?? 1, query.limit ?? 20);
    }
}
