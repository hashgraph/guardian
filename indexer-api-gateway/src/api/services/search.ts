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
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';

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

    /**
     * Get vp documents
     * @get
     */
    @Get('/vp-documents')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiQuery({
        name: 'pageIndex',
        description: 'Page index.',
        type: Number,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        description: 'Page size.',
        type: Number,
        example: 20
    })
    @ApiQuery({
        name: 'orderField',
        description: 'Order field.',
        type: String,
        example: 'topicId'
    })
    @ApiQuery({
        name: 'orderDir',
        description: 'Order direction.',
        type: String,
        example: 'DESC'
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
    async getVpDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_VP_DOCUMENTS,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
            }
        );
    }

    /**
     * Get vp documents
     * @get
     */
    @Get('/vp-documents/:messageId')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiImplicitParam({
        name: 'messageId',
        type: String,
        description: '.',
        required: true,
        example: '1706817574.985741019'
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
    async getVpDocument(
        @Param('messageId') messageId: string
    ): Promise<any> {
        return await this.send<any>(IndexerMessageAPI.GET_VP_DOCUMENT, { messageId });
    }

    /**
     * Get vp relationships
     * @get
     */
    @Get('/vp-documents/:messageId/relationships')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiImplicitParam({
        name: 'messageId',
        type: String,
        description: '.',
        required: true,
        example: '1706817574.985741019'
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
    async getVpRelationships(
        @Param('messageId') messageId: string
    ): Promise<any> {
        return await this.send<any>(IndexerMessageAPI.GET_VP_RELATIONSHIPS, { messageId });
    }




}
