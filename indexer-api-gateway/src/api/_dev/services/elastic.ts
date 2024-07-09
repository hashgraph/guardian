import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { InternalServerErrorDTO, PageDTO } from '../../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { IPage, IndexerMessageAPI } from '@indexer/common';
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
