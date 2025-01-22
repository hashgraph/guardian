import { Controller, HttpCode, HttpStatus, Body, Post, Get } from '@nestjs/common';
import {
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { IndexerMessageAPI, Message } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import {
    InternalServerErrorDTO,
    RawMessageDTO,
    SearchPolicyParamsDTO,
    SearchPolicyResultDTO,
    MessageDTO,
} from '#dto';

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
}
