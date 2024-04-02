import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern } from '@nestjs/microservices';
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
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom, timeout } from 'rxjs';
import { AnyResponse, IPage, IndexerMessageAPI, responseFrom } from '@indexer/common';

@Controller('logs')
@ApiTags('logs')
export class LogsApi {
    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) {
    }

    private async send<T>(api: IndexerMessageAPI, body: any): Promise<T> {
        const result = await firstValueFrom(this.client.send<AnyResponse<T>>(api, body));
        return responseFrom(result);
    }

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
        example: 'document'
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
    async getMessages(
        @Query('type') type?: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.GET_MESSAGES,
            {
                type,
                pageIndex,
                pageSize
            }
        );
    }
}
