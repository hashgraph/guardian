import { Controller, HttpCode, HttpStatus, Get, Query, Body, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi extends ApiClient {
    @Post('/search/policy')
    @HttpCode(HttpStatus.OK)
    async search(
        @Body() body: {
            text: string;
            minVcCount?: number;
            minVpCount?: number;
            minTokensCount?: number;
            threshold?: number;
            owner?: string;
            block?: any;
        }
    ) {
        return await this.send(IndexerMessageAPI.GET_ANALYTICS_SEARCH_POLICY, body);
    }
}