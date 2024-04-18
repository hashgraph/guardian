import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Post, Param, Inject, Query } from '@nestjs/common';
import { InternalServerErrorDTO, PageDTO } from '../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiQuery
} from '@nestjs/swagger';
import { AnyResponse, IPage, IResults, IndexerMessageAPI, responseFrom } from '@indexer/common';
import { ApiClient } from '../api-client.js';

@Controller('search')
@ApiTags('search')
export class SearchApi extends ApiClient {
    /**
     * Get
     * @get
     */
    @Get('/')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiQuery({
        name: 'search',
        description: 'Search.',
        type: String,
        example: '0.0.1'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: PageDTO
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async search(
        @Query('search') search?: string
    ): Promise<any> {
        return await this.send<IResults<any>>(IndexerMessageAPI.GET_SEARCH_API, { search });
    }
}
