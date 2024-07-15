import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { InternalServerErrorDTO } from '../../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiExcludeController,
} from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
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
