import { Controller, HttpCode, HttpStatus, Body, Post, Get, Param, Query } from '@nestjs/common';
import {
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { IndexerMessageAPI, ZipUtils } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import {
    InternalServerErrorDTO,
    RawMessageDTO,
    SearchPolicyParamsDTO,
    SearchPolicyResultDTO,
    MessageDTO,
} from '#dto';
import { PolicyFiltersDTO } from '../../dto/policy-filters.dto.js';
import { ComparePoliciesDTO } from '../../dto/compare-policies.dto.js';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi extends ApiClient {
    @ApiOperation({
        summary: 'Search policy',
        description: 'Returns search policy result',
    })
    @ApiBody({
        description: 'Search policy parameters',
        type: SearchPolicyParamsDTO,
    })
    @ApiOkResponse({
        description: 'Search policy result',
        type: [SearchPolicyResultDTO],
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity',
    })
    @Post('/search/policy')
    @HttpCode(HttpStatus.OK)
    async search(@Body() body: SearchPolicyParamsDTO) {
        return await this.send(
            IndexerMessageAPI.GET_ANALYTICS_SEARCH_POLICY,
            body
        );
    }

    @ApiOperation({
        summary: 'Search contract retirements',
        description: 'Returns contract retirements result',
    })
    @ApiBody({
        description: 'Search policy parameters',
        type: RawMessageDTO,
    })
    @ApiOkResponse({
        description: 'Search policy result',
        type: [MessageDTO],
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @ApiUnprocessableEntityResponse({
        description: 'Unprocessable entity',
    })
    @Post('/search/retire')
    @HttpCode(HttpStatus.OK)
    async getRetireDocuments(@Body() body: RawMessageDTO) {
        return await this.send(
            IndexerMessageAPI.GET_RETIRE_DOCUMENTS,
            body
        );
    }

    @Get('/checkAvailability')
    @ApiOperation({
        summary: 'Get indexer availability',
        description: 'Returns indexer availability',
    })
    @ApiOkResponse({
        description: 'Indexer availability result',
        type: Boolean,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getIndexerAvailability(): Promise<boolean> {
        return await this.send(IndexerMessageAPI.GET_INDEXER_AVAILABILITY, {});
    }

    /**
     * Compare policy with original state
     */
    @Post('/compare/policy/original/:messageId')
    @ApiOkResponse({
        description: 'Successful operation.',
        type: ComparePoliciesDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async compareOriginalPolicy(
        @Param('messageId') messageId: string,
        @Body() filters: PolicyFiltersDTO
    ): Promise<ComparePoliciesDTO> {
        const zip = await this.send<string>(IndexerMessageAPI.GET_COMPARE_ORIGINAL_POLICY, {
            messageId: messageId,
            options: {
                eventsLvl: filters?.eventsLvl,
                propLvl: filters?.propLvl,
                childrenLvl: filters?.childrenLvl,
                idLvl: filters?.idLvl
            }
        });
        return await ZipUtils.unZipJson(zip);
    }

    /**
     * Get policy derivations
     */
    @Get('/derivations/:messageId')
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getDerivations(
        @Param('messageId') messageId: string,
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string, 
        @Query('analytics.tools') tool?: string,
    ) {
        return await this.send(IndexerMessageAPI.GET_DERIVATIONS, {
            messageId,
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
            'analytics.tools': tool,
        });
    }
}
