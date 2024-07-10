import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern } from '@nestjs/microservices';
import { InternalServerErrorDTO } from '../../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
    ApiQuery,
    ApiExcludeController
} from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom, timeout } from 'rxjs';
import { AnyResponse, IndexerMessageAPI, responseFrom } from '@indexer/common';
import { ApiClient } from '../../api-client.js';

@Controller('elastic')
@ApiTags('elastic')
@ApiExcludeController()
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
        description: 'Successful operation.'
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
        return await this.send(IndexerMessageAPI.ELASTIC_UPDATE_DATA, {});
    }
}
