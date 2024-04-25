import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Param, Inject, Query } from '@nestjs/common';
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

@Controller('elastic')
@ApiTags('elastic')
export class ElasticApi extends ApiClient {
    /**
     * Get
     */
    @Post('/update')
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
    async getAllMessages(): Promise<any> {
        return await this.send<IPage<any>>(IndexerMessageAPI.ELASTIC_UPDATE_DATA, {});
    }
}
