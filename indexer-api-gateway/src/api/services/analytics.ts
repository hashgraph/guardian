import { Controller, HttpCode, HttpStatus, Body, Post } from '@nestjs/common';
import {
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import {
    InternalServerErrorDTO,
    SearchPolicyParamsDTO,
    SearchPolicyResultDTO,
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
    @Post('/search/policy')
    @HttpCode(HttpStatus.OK)
    async search(@Body() body: SearchPolicyParamsDTO) {
        return await this.send(
            IndexerMessageAPI.GET_ANALYTICS_SEARCH_POLICY,
            body
        );
    }
}
