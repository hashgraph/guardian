import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Param, Inject } from '@nestjs/common';
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
    ApiTags
} from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom, timeout } from 'rxjs';
import { IndexerMessageAPI } from '@indexer/common';

@Controller('status')
@ApiTags('status')
export class StatusApi {
    private readonly workers: Map<string, any>;
    private readonly indexers: Map<string, any>;

    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) {
        this.workers = new Map();
        this.indexers = new Map();
        setTimeout(() => {
            this.client.emit(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS, '');
            this.client.emit(IndexerMessageAPI.GET_INDEXER_STATUS, '');
        })
    }

    @EventPattern(IndexerMessageAPI.INDEXER_WORKER_STATUS)
    async onWorkerStatus(data: any) {
        data.time = Date.now();
        this.workers.set(data.id, data);
    }

    @EventPattern(IndexerMessageAPI.INDEXER_STATUS)
    async onIndexerStatus(data: any) {
        data.time = Date.now();
        this.indexers.set(data.id, data);
    }

    /**
     * Get
     */
    @Get('/')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getStatus(): Promise<any> {
        const workers = [];
        const indexers = [];
        const time = Date.now();
        for (const worker of this.workers.values()) {
            if (time - worker.time > 2 * worker.delay) {
                worker.status = 'SERVICE NOT AVAILABLE'
            }
            workers.push(worker);
        }
        for (const indexer of this.indexers.values()) {
            if (time - indexer.time > 2 * indexer.delay) {
                indexer.status = 'SERVICE NOT AVAILABLE'
            }
            indexers.push(indexer);
        }
        return { workers, indexers };
    }
}
