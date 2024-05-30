import { Controller, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IPage, IndexerMessageAPI, Message } from '@indexer/common';
import { ApiClient } from '../api-client.js';

@Controller('search')
@ApiTags('search')
export class SearchApi extends ApiClient {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async search(
        @Query('pageIndex') pageIndex: number,
        @Query('search') search?: string
    ) {
        return await this.send(
            IndexerMessageAPI.GET_SEARCH_API,
            { search, pageIndex }
        );
    }
}
