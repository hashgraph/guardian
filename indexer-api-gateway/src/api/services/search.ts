import { Controller, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ApiPaginatedResponse } from '../../decorators/api-paginated-response.js';
import { SearchItemDTO } from '#dto';

@Controller('search')
@ApiTags('search')
export class SearchApi extends ApiClient {
    @ApiOperation({
        summary: 'Search',
        description: 'Full-text indexer search',
    })
    @ApiQuery({
        name: 'pageIndex',
        description: 'Page index',
        example: 0,
    })
    @ApiQuery({
        name: 'search',
        description: 'Search phrase',
        example: 'Project',
    })
    @Get('/')
    @HttpCode(HttpStatus.OK)
    @ApiPaginatedResponse('Search results', SearchItemDTO)
    async search(
        @Query('pageIndex') pageIndex: number,
        @Query('search') search?: string
    ): Promise<SearchItemDTO[]> {
        return await this.send(IndexerMessageAPI.GET_SEARCH_API, {
            search,
            pageIndex,
        });
    }
}
