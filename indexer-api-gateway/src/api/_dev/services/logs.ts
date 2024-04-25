import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern } from '@nestjs/microservices';
import { InternalServerErrorDTO, PageDTO } from '../../../middlewares/validation/schemas/index.js';
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
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom, timeout } from 'rxjs';
import { AnyResponse, IPage, IndexerMessageAPI, responseFrom } from '@indexer/common';
import { ApiClient } from '../../api-client.js';

@Controller('logs')
@ApiTags('logs')
export class LogsApi extends ApiClient {
    /**
     * Get
     */
    @Get('/messages')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiQuery({
        name: 'type',
        description: 'Document type.',
        type: String,
        example: 'type'
    })
    @ApiQuery({
        name: 'status',
        description: 'Document status.',
        type: String,
        example: 'status'
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
    async getAllMessages(
        @Query('timestamp') timestamp?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,

    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_MESSAGES,
            {
                timestamp,
                type,
                status,
                pageIndex,
                pageSize,
                orderField,
                orderDir
            }
        );
    }

    /**
     * Get
     */
    @Get('/topics')
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
    async getAllTopics(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,

    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_TOPICS,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir
            }
        );
    }

    /**
     * Get
     */
    @Get('/documents')
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
    async getAllDocuments(
        @Query('timestamp') timestamp?: string,
        @Query('type') type?: string,
        @Query('status') status?: string,
        @Query('action') action?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,

    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_DOCUMENTS,
            {
                timestamp,
                type,
                status,
                action,
                pageIndex,
                pageSize,
                orderField,
                orderDir
            }
        );
    }

    /**
     * Get
     */
    @Get('/documents/filters')
    @ApiOperation({
        summary: '.',
        description: '.'
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
    async getDocumentFilters(): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_DOCUMENT_FILTERS, {});
    }

    /**
     * Get
     */
    @Get('/tokens')
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
    async getAllTokens(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('type') type?: string,
        @Query('tokenId') tokenId?: string

    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_TOKENS,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                type,
                tokenId
            }
        );
    }

    /**
     * Get
     */
    @Get('/nfts')
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
    async getAllNfts(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('tokenId') tokenId?: string,
        @Query('serialNumber') serialNumber?: number,
        @Query('metadata') metadata?: string

    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_LOG_NFTS,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                tokenId,
                serialNumber,
                metadata
            }
        );
    }
}
