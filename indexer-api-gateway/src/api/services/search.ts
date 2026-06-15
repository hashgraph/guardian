import { Controller, HttpCode, HttpStatus, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiInternalServerErrorResponse, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ApiPaginatedResponse } from '#decorators';
import { InternalServerErrorDTO, SearchItemDTO, AdvancedSearchParamsDTO, AdvancedSearchResultDTO } from '#dto';

@Controller('search')
@ApiTags('search')
export class SearchApi extends ApiClient {
    @ApiOperation({
        summary: 'Search',
        description: 'Full-text indexer search',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiPaginatedResponse('Search results', SearchItemDTO)
    @Get('/')
    @ApiQuery({
        name: 'pageIndex',
        description: 'Page index',
        example: 0,
        required: true,
        type: 'number',
    })
    @ApiQuery({
        name: 'pageSize',
        description: 'Page size',
        example: 10,
        required: true,
        schema: {
            type: 'number',
            maximum: 100
        }
    })
    @ApiQuery({
        name: 'search',
        description: 'Search phrase',
        example: 'Project',
    })
    @HttpCode(HttpStatus.OK)
    async search(
        @Query('pageIndex') pageIndex: number,
        @Query('pageSize') pageSize: number,
        @Query('search') search?: string
    ): Promise<SearchItemDTO[]> {
        return await this.send(IndexerMessageAPI.GET_SEARCH_API, {
            search,
            pageIndex,
            pageSize
        });
    }

    @ApiOperation({
        summary: 'Advanced Search',
        description:
            'Multi-step, multi-condition search across Indexer documents. ' +
            'Supports exact match, substring, regex, range, and set operators. ' +
            'Steps can cross-reference field values from previous steps. ' +
            'The response includes configurable display columns and a serialised ' +
            'search token that can be saved as a URL bookmark.',
    })
    @ApiBody({ type: AdvancedSearchParamsDTO })
    @ApiOkResponse({ type: AdvancedSearchResultDTO })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @Post('/advanced')
    @HttpCode(HttpStatus.OK)
    async advancedSearch(
        @Body() body: AdvancedSearchParamsDTO
    ): Promise<AdvancedSearchResultDTO> {
        return await this.send(IndexerMessageAPI.GET_ADVANCED_SEARCH_API, body);
    }
}
